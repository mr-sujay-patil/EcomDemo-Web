#!/usr/bin/env bash
# Runs the backend's compose stack (the read-only clone, ../ecomdemo-backend-readonly) WITHOUT colliding with the backend team's
# own stack on the same machine. Their compose file gives every container a fixed name (ecomdemo-<service>) and publishes the
# default host ports (8080, 3000, 5432, ...), so two stacks cannot run at once and whoever starts second is blocked.
#
# This script leaves the clone untouched and starts it with a generated override file that
#   - renames every container to webstack-<service>, and
#   - moves every published host port up by 20000 (the gateway is on 28080, Grafana on 23000, ...).
# The override is built from the clone's own `docker compose config` each time, so a service the backend adds later is covered too.
# Nothing inside the stack uses a container name (containers reach each other by service name), so nothing else changes. The
# compose project keeps its name (ecomdemo-backend-readonly), so networks and volumes stay apart from the backend team's (`ecomdemo`).
#
#   bash scripts/backend-stack.sh up        # build if needed, start, wait until healthy
#   bash scripts/backend-stack.sh down      # stop and remove the containers (never the volumes)
#   bash scripts/backend-stack.sh ps        # what runs, with the shifted ports
#   bash scripts/backend-stack.sh config    # what WOULD run: each service's container name and host ports (starts nothing)
#   bash scripts/backend-stack.sh env       # the variables the web tools need (eval "$(bash scripts/backend-stack.sh env)")
set -euo pipefail
cd "$(dirname "$0")/.."

backend="${BACKEND_DIR:-../ecomdemo-backend-readonly}"
prefix="${STACK_PREFIX:-webstack}"
shift_by="${PORT_SHIFT:-20000}"
override="$(mktemp --suffix=.compose-override.yaml)"
trap 'rm -f "$override"' EXIT

[ -f "$backend/compose.yaml" ] || { echo "No compose.yaml in $backend (set BACKEND_DIR)." >&2; exit 1; }

# Writes the override from what compose resolves (so BIND_ADDRESS and the like are honoured). `!override` replaces the ports
# list instead of adding to it (Compose 2.24 or newer).
python3 - "$backend" "$prefix" "$shift_by" > "$override" <<'PY'
import json, subprocess, sys
backend, prefix, shift = sys.argv[1], sys.argv[2], int(sys.argv[3])
config = json.loads(subprocess.run(["docker", "compose", "config", "--format", "json"], cwd=backend,
                                   check=True, capture_output=True, text=True).stdout)
print("services:")
for name, service in config["services"].items():
    ports = []
    for port in service.get("ports", []):
        published = int(port["published"])
        if published + shift > 65535:
            sys.exit(f"{name}: port {published} + {shift} is past 65535")
        host = port.get("host_ip", "")
        ports.append(f"{host + ':' if host else ''}{published + shift}:{port['target']}" + (f"/{port['protocol']}" if port.get("protocol", "tcp") != "tcp" else ""))
    print(f"  {name}:")
    print(f"    container_name: {prefix}-{name}")
    if ports:
        print("    ports: !override")
        for p in ports:
            print(f"      - '{p}'")
PY

compose() { docker compose --project-directory "$backend" -f "$backend/compose.yaml" -f "$override" "$@"; }

case "${1:-}" in
  up)   compose up --build --wait --wait-timeout "${WAIT_TIMEOUT:-900}" -d ;;
  down) compose --profile tools down ;;
  ps)   compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' ;;
  config)
    compose config --format json | python3 -c "
import json, sys
for name, s in json.load(sys.stdin)['services'].items():
    print(name.ljust(24), s['container_name'].ljust(34), [f\"{p.get('host_ip', '')}:{p['published']}\" for p in s.get('ports', [])])
" ;;
  env)
    echo "export API_TARGET=http://localhost:$((8080 + shift_by))"
    echo "export GATEWAY_CONTAINER=${prefix}-gateway-service" ;;
  *) echo "usage: $0 up|down|ps|config|env" >&2; exit 2 ;;
esac
