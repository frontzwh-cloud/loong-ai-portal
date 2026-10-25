#!/usr/bin/env bash
# Download one reviewed, immutable GitHub commit; do not execute a moving branch.
set -Eeuo pipefail
commit=${1:-}
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'Usage: bash bootstrap.sh <published 40-character commit SHA>' >&2; exit 1; }
command -v curl >/dev/null || { echo 'curl is required.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker must already be installed.' >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
curl --fail --location --show-error --retry 2 \
  "https://github.com/frontzwh-cloud/loong-ai-portal/archive/$commit.tar.gz" -o "$work/source.tar.gz"
mkdir "$work/source"
tar -xzf "$work/source.tar.gz" --no-same-owner --strip-components=1 -C "$work/source"
[[ -f "$work/source/deploy.sh" ]] || { echo 'Downloaded commit has no Ubuntu deployment script. Check publication/SHA.' >&2; exit 1; }
bash "$work/source/deploy.sh" install
