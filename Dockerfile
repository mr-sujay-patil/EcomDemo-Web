# The shop's web container: stage 1 builds the app, stage 2 is nginx serving the build and forwarding /api to the gateway.
# Base images are pinned by tag AND digest, so a rebuild next year is the same bytes (renew them on purpose, in a PR).

# --- Stage 1: build. Node lives only here; the final image has none. ---
# Same Node as .nvmrc and package.json "engines".
FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
# The lockfile and manifest first: this layer, and the install below, are reused until a dependency changes.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Compress the text files once, at the strongest level (-9), next to the originals: nginx serves the .gz file as it is
# (`gzip_static on`), smaller than its on-the-fly level-1 gzip and with no CPU spent per request. Fonts are already compressed.
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) -exec gzip -9 -k {} \;

# --- Stage 2: serve. The official nginx, stable line, alpine-slim variant (21 MB; the full alpine image is 94 MB). ---
FROM nginx:1.30.5-alpine-slim@sha256:32463212baf0e7d91aded2e9b843a4f2b9e017804b8c9d5bae7b51dcef64389c
# Trivy (CI, `image` job) failed the build on pcre2 10.48-r0 (CVE-2026-103111, HIGH, fixed in 10.49-r0): the newest nginx base image
# still ships it. Upgrade that one package; remove this line when the base image does (the scan then passes without it).
RUN apk upgrade --no-cache pcre2
# Runs as the image's own unprivileged `nginx` user (uid 101) and listens on 8080, a port a non-root user may bind.
# The pid file goes to /tmp, and the config the entrypoint renders from the template and the cache directories
# are handed to that user, so nothing needs root at start-up.
RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# Not a template (no variables): a plain file the server's locations include.
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Where /api goes. Compose overrides it; this default is the backend's own service name and port.
ENV API_UPSTREAM=http://gateway-service:8080
# Makes the image's entrypoint read the DNS server from /etc/resolv.conf into NGINX_LOCAL_RESOLVERS (nginx.conf uses it;
# in compose that is Docker's own resolver, which knows the backend's service names).
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
