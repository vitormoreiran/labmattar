#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
if [[ "${SITES_REQUIRE_HOSTING_MANIFEST:-0}" == "1" && ! -f "${hosting}" ]]; then
  echo "Missing required Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
fi
[[ -d "${SITES_PROJECT_ROOT}/dist/client" ]] || {
  echo "Missing compiled client assets: dist/client" >&2
  exit 66
}

node --check "${worker}"
if [[ -f "${hosting}" ]]; then
  node --input-type=module - "${hosting}" <<'NODE'
import { readFileSync } from 'node:fs';
JSON.parse(readFileSync(process.argv[2], 'utf8'));
NODE
fi

echo "Validated Worker artifact and client assets; optional Sites manifest checked if present."
