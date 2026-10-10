#!/usr/bin/env bash
# web KI-035: nginx in the web image reaches an HTTPS gateway only when its certificate verifies, and a plain HTTP gateway
# (compose) exactly as before. No backend and no cluster: a stand-in "gateway" (the same image, running its own nginx with
# a throwaway CA's certificate) answers /api/ on a private Docker network, and four web containers are pointed at it.
#
#   bash scripts/test-nginx-upstream-tls.sh [image]        # default: ecomdemo-web:ci (the image CI builds)
#
#   1. https, the right CA                   -> 200
#   2. https, a CA that did not sign it      -> 502 (nginx refuses the gateway)
#   3. https, a name the certificate lacks   -> 502 (nginx checks the name, not only the signature)
#   4. http, no CA setting (compose)         -> 200
set -euo pipefail

image="${1:-ecomdemo-web:ci}"
run="kitls$$"
work="$(mktemp -d)"
network="${run}-net"
# Every container is labelled with this run, and removed by that label: status_through runs in a subshell, so a list kept in
# a variable would not see the containers it starts.
cleanup() {
  docker ps --all --quiet --filter "label=${run}" | xargs -r docker rm --force >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

# A CA, the gateway's certificate from it (for gateway.test only), and a second CA that signed nothing here.
cd "$work"
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj /CN=test-ca -days 1 \
  -keyout ca.key -out ca.crt 2>/dev/null
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj /CN=other-ca -days 1 \
  -keyout wrong.key -out wrong.crt 2>/dev/null
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj /CN=gateway.test \
  -keyout gateway.key -out gateway.csr 2>/dev/null
printf 'subjectAltName=DNS:gateway.test\n' > san.ext
openssl x509 -req -in gateway.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 1 -extfile san.ext \
  -out gateway.crt 2>/dev/null
cat > gateway.conf <<'EOF'
pid /tmp/gateway.pid;
error_log stderr warn;
events {}
http {
    access_log off;
    server {
        listen 8443 ssl;
        ssl_certificate /stand-in/gateway.crt;
        ssl_certificate_key /stand-in/gateway.key;
        location /api/ { default_type application/json; return 200 '{"from":"https"}'; }
    }
    server {
        listen 8080;
        location /api/ { default_type application/json; return 200 '{"from":"http"}'; }
    }
}
EOF
# mktemp makes the directory private; the containers run as the `nginx` user (uid 101) and must read it.
chmod 755 "$work"
chmod 644 ./*

docker network create "$network" >/dev/null
docker run -d --label "$run" --name "${run}-gateway" --network "$network" --network-alias gateway.test --network-alias other.test \
  -v "$work:/stand-in:ro" --entrypoint nginx "$image" -g 'daemon off;' -c /stand-in/gateway.conf >/dev/null

# Starts a web container with the given environment and prints the status of GET /api/products through it.
status_through() {
  local name="${run}-web-$RANDOM"
  docker run -d --label "$run" --name "$name" --network "$network" -v "$work:/ca:ro" -p 127.0.0.1::8080 "$@" "$image" >/dev/null
  local port
  port="$(docker port "$name" 8080/tcp | head -n 1 | sed 's/.*://')"
  for _ in $(seq 1 30); do
    curl --fail --silent "http://127.0.0.1:${port}/healthz" >/dev/null && break
    sleep 1
  done
  curl --silent --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${port}/api/products"
}

failed=0
expect() {
  local want="$1" got="$2" what="$3"
  if [ "$got" = "$want" ]; then
    echo "PASS: $what ($got)"
  else
    echo "FAIL: $what: expected $want, got $got" >&2
    failed=1
  fi
}

expect 200 "$(status_through -e API_UPSTREAM=https://gateway.test:8443 -e API_CA_FILE=/ca/ca.crt)" \
  "https upstream, certificate from the trusted CA"
expect 502 "$(status_through -e API_UPSTREAM=https://gateway.test:8443 -e API_CA_FILE=/ca/wrong.crt)" \
  "https upstream, certificate from a CA nginx does not trust"
expect 502 "$(status_through -e API_UPSTREAM=https://other.test:8443 -e API_CA_FILE=/ca/ca.crt)" \
  "https upstream, a name the certificate does not carry"
expect 200 "$(status_through -e API_UPSTREAM=http://gateway.test:8080)" \
  "plain http upstream with the image's defaults (compose)"

exit "$failed"
