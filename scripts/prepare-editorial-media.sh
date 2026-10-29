#!/usr/bin/env bash
set -euo pipefail
mkdir -p public/ambiente-editorial/media
git fetch --no-tags --depth=1 origin acervo-publicado-2026-10-28
SOURCE="origin/acervo-publicado-2026-10-28"
BASE="LABMATTAR-SITE-PUBLICADO-LIMPO-2026-10-28/public/assets/chapter2"
for name in aleteia concha-y-toro dadiva; do
  git show "$SOURCE:$BASE/$name.jpg" > "public/ambiente-editorial/media/$name.jpg"
  test "$(wc -c < "public/ambiente-editorial/media/$name.jpg")" -gt 10000
done
echo "Acervo fotografico original incluido na previa."
