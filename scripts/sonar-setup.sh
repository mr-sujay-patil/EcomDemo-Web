#!/usr/bin/env bash
# Prepares the shop's SonarQube (compose.sonar.yaml) for an analysis, through SonarQube's web API (Phase 25, web KI-014).
# It mirrors the backend's scripts/sonar-setup.sh (its Phase 12).
#
# WHY A SCRIPT. The quality gate, the project and the admin password live in SonarQube's database, not in this repository:
# `docker compose -f compose.sonar.yaml down -v` deletes them, and anyone starting a fresh server would get SonarQube's
# defaults instead of ours. This script is the gate as code: run it after every fresh start, as often as you like.
#
#   docker compose -f compose.sonar.yaml up -d --wait
#   read -rs SONAR_ADMIN_PASSWORD && export SONAR_ADMIN_PASSWORD    # your choice; never written to a file
#   bash scripts/sonar-setup.sh               # password, project, gate, and a new analysis token (printed once)
#   bash scripts/sonar-setup.sh --no-token    # the same, without a new token
#
# What it does, each step only when needed (it is idempotent):
#   1. waits until SonarQube reports UP
#   2. signs in as admin with SONAR_ADMIN_PASSWORD; on a fresh server (still the factory admin/admin) it changes the password
#      to SONAR_ADMIN_PASSWORD first, so the server never keeps a password the whole internet knows
#   3. creates the project `ecomdemo-web`
#   4. creates the quality gate `EcomDemo Web way` and sets its conditions, all on NEW code, with this file's thresholds
#   5. makes it the project's gate
#   6. generates a project analysis token (it can analyse this one project and nothing else) and prints it ONCE, with the
#      line to export it as SONAR_TOKEN. The token is never written to a file; a new run replaces the old token.
#
# Secrets never appear on a command line here either: curl reads the credentials and the form values from its standard
# input (`--config -`), because a command line is visible to every user of the machine in `ps`.
set -euo pipefail

SONAR_URL="${SONAR_URL:-http://localhost:${SONAR_PORT:-9010}}"
ADMIN_USER="${SONAR_ADMIN_USER:-admin}"
PROJECT_KEY="${SONAR_PROJECT_KEY:-ecomdemo-web}"
PROJECT_NAME="${SONAR_PROJECT_NAME:-EcomDemo Web}"
GATE_NAME="${SONAR_GATE_NAME:-EcomDemo Web way}"
TOKEN_NAME="${SONAR_TOKEN_NAME:-ecomdemo-web-analysis}"
# SonarQube's documented factory password: public knowledge, not a secret. Used once, to replace it.
FACTORY_PASSWORD='admin'

new_token=true
case "${1:-}" in
  '') ;;
  --no-token) new_token=false ;;
  *) echo "Usage: bash scripts/sonar-setup.sh [--no-token]" >&2; exit 2 ;;
esac

ok() { printf '  OK    %s\n' "$1"; }
same() { printf '  --    %s\n' "$1"; }
die() { printf '  FAIL  %s\n' "$1" >&2; exit 1; }

command -v curl >/dev/null || die "curl is needed"
command -v python3 >/dev/null || die "python3 is needed (it reads SonarQube's JSON answers)"

if [ -z "${SONAR_ADMIN_PASSWORD:-}" ]; then
  cat >&2 <<'HELP'
SONAR_ADMIN_PASSWORD is not set. Choose the admin password (SonarQube asks for at least 12 characters with upper and lower
case, a digit and a symbol) and set it in this shell only, without it landing in your shell history:

  read -rs SONAR_ADMIN_PASSWORD && export SONAR_ADMIN_PASSWORD

On a fresh server this script changes the factory admin/admin to it; afterwards it is the password you sign in with.
HELP
  exit 1
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

# Quotes a value for a curl config file: backslashes and double quotes escaped, the whole wrapped in double quotes.
quote() {
  local value="${1//\\/\\\\}"
  printf '"%s"' "${value//\"/\\\"}"
}

# api <password> <METHOD> <path> [name=value ...]: prints the HTTP status; the answer is left in "$body".
# The status matters as much as the answer: SonarQube says 401 with an EMPTY body for a wrong password.
api() {
  local password="$1" method="$2" path="$3" pair
  shift 3
  {
    printf 'user = %s\n' "$(quote "$ADMIN_USER:$password")"
    for pair in "$@"; do printf 'data-urlencode = %s\n' "$(quote "$pair")"; done
  } | if [ "$method" = GET ]; then
    # -G sends the form values as an encoded query string (the gate's name has spaces).
    curl -sS -G -o "$body" -w '%{http_code}' --config - "$SONAR_URL$path" 2>/dev/null || true
  else
    curl -sS -X "$method" -o "$body" -w '%{http_code}' --config - "$SONAR_URL$path" 2>/dev/null || true
  fi
}

# json <python expression over `d`, the last answer> [value]: prints the result. A value the expression needs (a name, a
# key) is passed as `a`, never pasted into the expression, so a quote in it cannot change the code.
json() {
  python3 -c 'import json, sys; d = json.load(open(sys.argv[1])); a = sys.argv[3]; print(eval(sys.argv[2]))' \
    "$body" "$1" "${2:-}"
}

explain() {
  case "$1" in
    401) echo "401: the server refused the admin password" ;;
    403) echo "403: '$ADMIN_USER' may not do this" ;;
    000 | '') echo "no answer from $SONAR_URL" ;;
    *) echo "HTTP $1 $(head -c 300 "$body")" ;;
  esac
}

printf 'SonarQube setup (%s)\n\n' "$SONAR_URL"

# 1. UP, not merely listening: the port answers for a minute or more while Elasticsearch and the migration still run.
printf '  ..    waiting for SonarQube to report UP'
for _ in $(seq 1 90); do
  if curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; then break; fi
  printf '.'
  sleep 5
done
printf '\n'
curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"' ||
  die "SonarQube is not UP at $SONAR_URL. Start it: docker compose -f compose.sonar.yaml up -d --wait"
ok "server is UP"

# 2. The admin password. /api/authentication/validate answers 200 {"valid":false} for a wrong password, so the body counts.
valid() {
  [ "$(api "$1" GET /api/authentication/validate)" = 200 ] && [ "$(json 'd["valid"]')" = True ]
}
if valid "$SONAR_ADMIN_PASSWORD"; then
  same "signed in as '$ADMIN_USER' (password already set)"
elif valid "$FACTORY_PASSWORD"; then
  status="$(api "$FACTORY_PASSWORD" POST /api/users/change_password \
    "login=$ADMIN_USER" "previousPassword=$FACTORY_PASSWORD" "password=$SONAR_ADMIN_PASSWORD")"
  [ "$status" = 204 ] || [ "$status" = 200 ] ||
    die "changing the factory password: $(explain "$status") (SonarQube wants 12+ characters: upper, lower, digit, symbol)"
  valid "$SONAR_ADMIN_PASSWORD" || die "the new password does not work after the change"
  ok "changed the factory admin password to SONAR_ADMIN_PASSWORD"
else
  die "neither SONAR_ADMIN_PASSWORD nor the factory password signs in as '$ADMIN_USER'. Set the password you chose before."
fi
password="$SONAR_ADMIN_PASSWORD"

# 3. The project. An analysis would create it too, but then the first analysis would run under the default gate.
status="$(api "$password" GET /api/projects/search "projects=$PROJECT_KEY")"
[ "$status" = 200 ] || die "listing projects: $(explain "$status")"
if [ "$(json "any(c['key'] == a for c in d['components'])" "$PROJECT_KEY")" = True ]; then
  same "project '$PROJECT_KEY' exists"
else
  status="$(api "$password" POST /api/projects/create "project=$PROJECT_KEY" "name=$PROJECT_NAME")"
  [ "$status" = 200 ] || die "creating project '$PROJECT_KEY': $(explain "$status")"
  ok "created project '$PROJECT_KEY'"
fi

# 4. The quality gate.
status="$(api "$password" GET /api/qualitygates/list)"
[ "$status" = 200 ] || die "listing quality gates: $(explain "$status")"
if [ "$(json "any(g['name'] == a for g in d['qualitygates'])" "$GATE_NAME")" = True ]; then
  same "quality gate '$GATE_NAME' exists"
else
  status="$(api "$password" POST /api/qualitygates/create "name=$GATE_NAME")"
  [ "$status" = 200 ] || die "creating quality gate '$GATE_NAME': $(explain "$status")"
  ok "created quality gate '$GATE_NAME'"
fi

# The conditions, all on NEW code (the metrics named new_*): "clean as you code". A condition on the WHOLE project either
# passes on day one and never teaches anything, or fails on day one on code nobody is touching and gets switched off. Judging
# each change by what it adds converges on the same place without blocking unrelated work. The six are the backend's.
# metric | operator (the gate FAILS when the value is <op> the threshold) | threshold | why
conditions=(
  "new_coverage|LT|80|new code must be tested; the unit tests cover ~100% of lines (vite.config.ts), so 80 is a floor we beat"
  "new_violations|GT|0|no new issue of any severity: the cheapest moment to fix one is before it is merged"
  "new_duplicated_lines_density|GT|3|copy-paste is cheap to catch and expensive to live with"
  "new_security_hotspots_reviewed|LT|100|a hotspot is a question (is this safe?): every one needs an answer"
  "new_reliability_rating|GT|1|no new bug (rating A)"
  "new_security_rating|GT|1|no new vulnerability (rating A)"
)

printf '\n  Conditions (all on new code):\n'
status="$(api "$password" GET /api/qualitygates/show "name=$GATE_NAME")"
[ "$status" = 200 ] || die "reading quality gate '$GATE_NAME': $(explain "$status")"
existing="$(json "'\n'.join(f\"{c['metric']}|{c['op']}|{c['error']}|{c['id']}\" for c in d['conditions'])")"
for entry in "${conditions[@]}"; do
  IFS='|' read -r metric op threshold why <<<"$entry"
  current="$(printf '%s\n' "$existing" | grep "^$metric|" || true)"
  if [ -z "$current" ]; then
    status="$(api "$password" POST /api/qualitygates/create_condition \
      "gateName=$GATE_NAME" "metric=$metric" "op=$op" "error=$threshold")"
    [ "$status" = 200 ] || die "adding $metric: $(explain "$status")"
    ok "$metric $op $threshold: $why"
  elif [ "${current%|*}" = "$metric|$op|$threshold" ]; then
    same "$metric $op $threshold: $why"
  else
    # Someone changed it in the UI: this file is the record of what the gate means, so it wins.
    status="$(api "$password" POST /api/qualitygates/update_condition \
      "id=${current##*|}" "metric=$metric" "op=$op" "error=$threshold")"
    [ "$status" = 204 ] || [ "$status" = 200 ] || die "updating $metric: $(explain "$status")"
    was="${current#*|}" && was="${was%|*}"
    ok "$metric $op $threshold (was ${was/|/ }): $why"
  fi
done
# A condition added in the UI that this file does not list is reported, not removed: decide, then add it here or delete it.
printf '%s\n' "$existing" | while IFS='|' read -r metric _; do
  [ -n "$metric" ] || continue
  printf '%s\n' "${conditions[@]}" | grep -q "^$metric|" ||
    printf '  !!    %s is on the gate but not in this script: add it here or remove it in the UI\n' "$metric"
done

# 5. Attach the gate to the project.
printf '\n'
status="$(api "$password" GET /api/qualitygates/get_by_project "project=$PROJECT_KEY")"
if [ "$status" = 200 ] && [ "$(json "d['qualityGate']['name'] == a" "$GATE_NAME")" = True ]; then
  same "'$GATE_NAME' is the quality gate of '$PROJECT_KEY'"
else
  status="$(api "$password" POST /api/qualitygates/select "gateName=$GATE_NAME" "projectKey=$PROJECT_KEY")"
  [ "$status" = 204 ] || [ "$status" = 200 ] || die "attaching the gate: $(explain "$status")"
  ok "'$GATE_NAME' is now the quality gate of '$PROJECT_KEY'"
fi

# 6. A token for the scanner: a PROJECT analysis token, so a leaked one can analyse this project and nothing else (it can
# not read other projects or administer anything). SonarQube shows a token only when it is made, so an old token of the
# same name is revoked and a new one generated.
if [ "$new_token" = false ]; then
  same "no new token (--no-token); the one you exported before still works"
  printf '\nNext: npm run test:coverage && npm run sonar   then open %s/dashboard?id=%s\n' "$SONAR_URL" "$PROJECT_KEY"
  exit 0
fi
status="$(api "$password" POST /api/user_tokens/revoke "name=$TOKEN_NAME")"
[ "$status" = 204 ] || [ "$status" = 200 ] || [ "$status" = 404 ] || die "revoking the old token: $(explain "$status")"
status="$(api "$password" POST /api/user_tokens/generate \
  "name=$TOKEN_NAME" "type=PROJECT_ANALYSIS_TOKEN" "projectKey=$PROJECT_KEY")"
[ "$status" = 200 ] || die "generating a token: $(explain "$status")"
ok "generated the analysis token '$TOKEN_NAME' (any older one with that name is revoked)"

cat <<NEXT

Shown once. Paste this line into your shell (not into a file in this repository, not into a chat):

  export SONAR_TOKEN='$(json 'd["token"]')'

Then:

  npm run test:coverage     # writes coverage/lcov.info, the coverage SonarQube imports
  npm run sonar             # analyses src/ and waits for the quality gate; fails when the gate fails

Dashboard: $SONAR_URL/dashboard?id=$PROJECT_KEY  (sign in as '$ADMIN_USER')
NEXT
