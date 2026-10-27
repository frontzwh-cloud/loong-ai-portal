#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
SOURCE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT=${PORTAL_HOME:-"$HOME/loong-ai-portal"}
[[ "$ROOT" = /* && "$ROOT" != / ]] || { echo 'PORTAL_HOME must be an absolute non-root directory.' >&2; exit 1; }
COMMAND=${1:-install}
WAIT_TIMEOUT=${PORTAL_WAIT_TIMEOUT:-90}
[[ "$WAIT_TIMEOUT" =~ ^[1-9][0-9]{0,3}$ ]] || { echo "Invalid PORTAL_WAIT_TIMEOUT" >&2; exit 1; }
PROJECT=loong-ai-portal
fail() { echo "ERROR: $*" >&2; exit 1; }
command -v docker >/dev/null || fail 'Docker is required. It will not be installed automatically.'
docker info >/dev/null 2>&1 || fail 'Cannot access Docker. Use an account already authorized to access the daemon.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required (2.30+ for literal env values).'
mkdir -p "$ROOT/releases" "$ROOT/shared"
# Serialize install/update/rollback/restart. Lock releases automatically on exit.
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || fail 'Another deployment operation is active; retry after it finishes.'
CONFIG="$ROOT/shared/portal.env"
SETTINGS="$ROOT/shared/deployment.env"
LINKS_DIR="$ROOT/shared/app-links"
mkdir -p "$LINKS_DIR"
if [[ "$(id -u)" == "0" ]]; then
  chown 10001:10001 "$LINKS_DIR"
  chmod 0700 "$LINKS_DIR"
elif [[ "$(stat -c %u "$LINKS_DIR")" != "10001" ]]; then
  fail 'App links directory must belong to container user 10001. Re-run deployment as root/sudo.'
fi
[[ -f "$CONFIG" ]] || cp "$SOURCE/deploy/portal.env.example" "$CONFIG"
[[ -f "$SETTINGS" ]] || cp "$SOURCE/deploy/deployment.env.example" "$SETTINGS"
compose() {
  local release=$1; shift
  PORTAL_CONFIG="$CONFIG" PORTAL_RELEASE="$(basename -- "$release")" PORTAL_LINKS_DIR="$LINKS_DIR" \
    docker compose --project-name "$PROJECT" --env-file "$SETTINGS" -f "$release/compose.yaml" "$@"
}
current() { [[ -L "$ROOT/current" ]] && readlink -f -- "$ROOT/current" 2>/dev/null || true; }
point_to() {
  local name=$1 target=$2
  ln -sfn -- "$target" "$ROOT/.$name.next"
  mv -Tf -- "$ROOT/.$name.next" "$ROOT/$name"
}
activate() {
  local target=$1 previous
  previous=$(current)
  compose "$target" config --quiet || fail 'Invalid Compose/configuration. Compose 2.30+ is required; config files were preserved.'
  if ! compose "$target" up -d --no-build --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
    echo 'Startup/health failed. Configuration and release files are preserved.' >&2
    if [[ -n "$previous" && -f "$previous/compose.yaml" && "$previous" != "$target" ]]; then
      echo "Restoring previous image: $(basename -- "$previous")" >&2
      compose "$previous" up -d --no-build --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT" || echo 'Automatic recovery failed; inspect docker compose logs and local configuration.' >&2
    fi
    return 1
  fi
  if [[ -n "$previous" && "$previous" != "$target" ]]; then point_to previous "$previous"; fi
  point_to current "$target"
  echo "Healthy release: $(basename -- "$target")"
  echo "AI configuration: $CONFIG"
  echo "Binding/port: $SETTINGS"
  echo 'Default URL: http://127.0.0.1:8000 (unless changed in deployment.env).'
}
case "$COMMAND" in
  install|update)
    for file in Dockerfile compose.yaml VERSION backend/main.py backend/admin.py backend/link_registry.py frontend/package-lock.json frontend/vitest.config.ts; do
      [[ -f "$SOURCE/$file" ]] || fail "Incomplete source package: missing $file"
    done
    stage=$(mktemp -d "$ROOT/releases/.staging.XXXXXXXX")
    trap '[[ -z "${stage:-}" ]] || rm -rf -- "$stage"' EXIT
    mkdir -p "$stage/backend" "$stage/frontend" "$stage/deploy"
    cp "$SOURCE/"{Dockerfile,.dockerignore,compose.yaml,VERSION,deploy.sh} "$stage/"
    cp "$SOURCE/backend/"{main.py,admin.py,link_registry.py,requirements.lock} "$stage/backend/"
    # Keep Vitest/jsdom configuration in the staged build, not only in the source checkout.
    cp "$SOURCE/frontend/"{package.json,package-lock.json,tsconfig.json,vite.config.ts,vitest.config.ts,index.html,collect-licenses.cjs} "$stage/frontend/"
    cp -R "$SOURCE/frontend/src" "$SOURCE/frontend/public" "$stage/frontend/"
    cp "$SOURCE/deploy/"*.example "$stage/deploy/"
    fingerprint=$(cd "$stage" && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-12)
    version=$(tr -d '\r\n' < "$SOURCE/VERSION")
    [[ "$version" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,50}$ ]] || fail 'Invalid VERSION.'
    target="$ROOT/releases/$version-$fingerprint"
    if [[ -d "$target" ]]; then rm -rf -- "$stage"; else mv -- "$stage" "$target"; fi
    stage=''
    compose "$target" config --quiet || fail 'Invalid Compose/configuration. Compose 2.30+ required.'
    image="loong-ai-portal:$(basename -- "$target")"
    if [[ -f "$SOURCE/images/portal-image.tar.gz" ]]; then
      (cd "$SOURCE/images" && sha256sum -c SHA256SUMS) || fail 'Image archive checksum failed.'
      docker load -i "$SOURCE/images/portal-image.tar.gz" || fail 'Cannot load the bundled Docker image.'
      docker image inspect "$image" >/dev/null 2>&1 || fail 'Bundled image does not match this source release.'
    fi
    # Reuse this exact content-versioned local image; otherwise build before replacing the container.
    if ! docker image inspect "$image" >/dev/null 2>&1; then
      compose "$target" build || fail 'Image build failed; current deployment was not replaced.'
    fi
    activate "$target"
    ;;
  rollback)
    target=$(readlink -f -- "$ROOT/previous" 2>/dev/null || true)
    [[ -n "$target" && -f "$target/compose.yaml" ]] || fail 'No previous release is recorded.'
    activate "$target"
    ;;
  restart|status|logs|stop)
    target=$(current)
    [[ -n "$target" && -f "$target/compose.yaml" ]] || fail 'No installed current release; run install first.'
    case "$COMMAND" in
      restart) compose "$target" up -d --no-build --force-recreate --wait --wait-timeout "$WAIT_TIMEOUT" ;;
      status) compose "$target" ps ;;
      logs) compose "$target" logs --tail=100 ;;
      stop) compose "$target" stop ;;
    esac
    ;;
  *) fail 'Usage: bash deploy.sh {install|update|rollback|restart|status|logs|stop}' ;;
esac
