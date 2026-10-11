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
# Logs reach Loki (web KI-039): the backend's Alloy ships only the compose project "ecomdemo". The override also mounts, over
# Alloy's config, a copy of the clone's own docker/alloy/config.alloy with that project rule pointed at this stack's project,
# generated here by scripts/alloy-override.mjs into .local/backend-stack/config.alloy (ignored; it must outlive this script,
# because the running container reads it). A backend whose Alloy service or config no longer looks as expected stops the start.
#
# CI starts its stack with this script too, keeping the backend's own container names and ports (.github/workflows/ci.yml):
#   STACK_PREFIX=ecomdemo PORT_SHIFT=0 NO_REBUILD=1 bash scripts/backend-stack.sh up
# NO_REBUILD=1 starts the images already there (CI loads them from its cache) and builds only a missing one, as a plain
# `docker compose up` does; without it `up` rebuilds (`--build`), which is quick on a laptop's layer cache.
#
#   bash scripts/backend-stack.sh up        # build if needed, start, wait until healthy
#   bash scripts/backend-stack.sh down      # stop and remove the containers (never the volumes)
#   bash scripts/backend-stack.sh ps        # what runs, with the shifted ports
#   bash scripts/backend-stack.sh config    # what WOULD run: each service's container name and host ports, and the Alloy
#                                           # config it mounts (starts nothing)
#   bash scripts/backend-stack.sh env       # the variables the web tools need (eval "$(bash scripts/backend-stack.sh env)"):
#                                           # API_TARGET, GATEWAY_CONTAINER, LOKI_URL, TEMPO_URL
set -euo pipefail
cd "$(dirname "$0")/.."

backend="${BACKEND_DIR:-../ecomdemo-backend-readonly}"
prefix="${STACK_PREFIX:-webstack}"
shift_by="${PORT_SHIFT:-20000}"
override="$(mktemp --suffix=.compose-override.yaml)"
alloy_source="$(mktemp --suffix=.alloy-source)"
trap 'rm -f "$override" "$alloy_source"' EXIT
alloy_copy="$PWD/.local/backend-stack/config.alloy"

[ -f "$backend/compose.yaml" ] || { echo "No compose.yaml in $backend (set BACKEND_DIR)." >&2; exit 1; }

# Writes the override from what compose resolves (so BIND_ADDRESS and the like are honoured). `!override` replaces the ports
# list instead of adding to it (Compose 2.24 or newer).
python3 - "$backend" "$prefix" "$shift_by" "$alloy_copy" "$alloy_source" > "$override" <<'PY'
import json, subprocess, sys
backend, prefix, shift, alloy_copy, alloy_source = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
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
    if name == "alloy":
        # Compose merges volumes by their path in the container, so this one entry replaces only the config mount.
        mounts = [v for v in service.get("volumes", []) if v.get("type") == "bind" and v["source"].endswith("config.alloy")]
        if len(mounts) != 1:
            sys.exit(f"alloy: expected one bind mount of a config.alloy, found {len(mounts)} (web KI-039: no logs would reach Loki)")
        print("    volumes:")
        print(f"      - '{alloy_copy}:{mounts[0]['target']}:ro'")
        with open(alloy_source, "w") as out:
            out.write(f"{config['name']}\n{mounts[0]['source']}\n")
if "alloy" not in config["services"]:
    sys.exit("No alloy service in the backend's compose.yaml (web KI-039: no logs would reach Loki).")
PY

# The Alloy config the override mounts, made from the clone's own file (web KI-039). It fails if that file is not as expected.
{ read -r project; read -r alloy_config; } < "$alloy_source"
node scripts/alloy-override.mjs "$alloy_config" "$project" "$alloy_copy"

build=(--build)
[ "${NO_REBUILD:-}" = 1 ] && build=()

compose() { docker compose --project-directory "$backend" -f "$backend/compose.yaml" -f "$override" "$@"; }

case "${1:-}" in
  up)   compose up "${build[@]}" --wait --wait-timeout "${WAIT_TIMEOUT:-900}" -d ;;
  down) compose --profile tools down ;;
  ps)   compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}' ;;
  config)
    compose config --format json | python3 -c "
import json, sys
for name, s in json.load(sys.stdin)['services'].items():
    print(name.ljust(24), s['container_name'].ljust(34), [f\"{p.get('host_ip', '')}:{p['published']}\" for p in s.get('ports', [])])
    if name == 'alloy':
        print(' ' * 25 + 'config: ' + ', '.join(v['source'] for v in s.get('volumes', []) if v['source'].endswith('config.alloy')))
" ;;
  env)
    echo "export API_TARGET=http://localhost:$((8080 + shift_by))"
    echo "export GATEWAY_CONTAINER=${prefix}-gateway-service"
    # Loki and Tempo, for the real service-down spec (web KI-032: the reference finds the gateway's line and the trace).
    echo "export LOKI_URL=http://localhost:$((3100 + shift_by))"
    echo "export TEMPO_URL=http://localhost:$((3200 + shift_by))" ;;
  *) echo "usage: $0 up|down|ps|config|env" >&2; exit 2 ;;
esac
