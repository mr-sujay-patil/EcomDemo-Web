#!/usr/bin/env bash
# `npm run sonar`: analyses src/ with SonarScanner and waits for the quality gate (Phase 25, web KI-014).
#
#   docker compose -f compose.sonar.yaml up -d --wait && bash scripts/sonar-setup.sh    once per fresh server
#   export SONAR_TOKEN='...'                                                            the line sonar-setup.sh printed
#   npm run test:coverage && npm run sonar
#
# The scanner is the pinned sonarsource/sonar-scanner-cli image, not an npm package: nothing is added to package.json, and
# the scanner's own Java runtime stays in its image. It joins compose.sonar.yaml's network and reaches the server by its
# service name, so it works the same on Docker Desktop and on a Linux host, with no host networking.
# The repository is mounted READ-ONLY (the image keeps its working files in /tmp/.scannerwork, inside the container), so an
# analysis cannot change a file here. The scanner's home, where it caches the analysers it downloads from the server, is
# the volume ecomdemo-web-sonar_scanner-home: the second run skips those downloads.
set -euo pipefail
cd "$(dirname "$0")/.."

image='sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0'
network="${SONAR_NETWORK:-ecomdemo-web-sonar_default}"
host_url="${SONAR_HOST_URL:-http://sonarqube:9000}"

if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "SONAR_TOKEN is not set. Run 'bash scripts/sonar-setup.sh' and paste the export line it prints." >&2
  exit 1
fi
if [ ! -s coverage/lcov.info ]; then
  echo "coverage/lcov.info is missing. Run 'npm run test:coverage' first: SonarQube imports coverage, it does not run tests." >&2
  exit 1
fi
if ! docker network inspect "$network" >/dev/null 2>&1; then
  echo "Docker network $network not found. Start SonarQube: docker compose -f compose.sonar.yaml up -d --wait" >&2
  exit 1
fi

# `-e SONAR_TOKEN` with no value passes the variable through from this environment: the token is never on a command line.
exec docker run --rm \
  --network "$network" \
  -e SONAR_TOKEN \
  -e SONAR_HOST_URL="$host_url" \
  -v "$PWD:/usr/src:ro" \
  -v ecomdemo-web-sonar_scanner-home:/opt/sonar-scanner/.sonar \
  "$image" \
  "$@"
