#!/usr/bin/env bash
# Uretim istemcisini derler: motor kopyalanir, tsc ES modullerini app/js'e yazar, kabuk dosyalari app/'a kopyalanir.
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd .. && pwd)
mkdir -p src/engine
cp "$ROOT/prototype/src/engine.ts" src/engine/engine.ts
rm -rf "$ROOT/app/js"
npx --no-install tsc -p tsconfig.json 2>/dev/null || tsc -p tsconfig.json
mkdir -p "$ROOT/app"
cp index.html style.css "$ROOT/app/"
cp static/manifest.webmanifest "$ROOT/app/"
# yayin numarasi kaynak dosyalarin ozeti: ayni kaynak -> ayni cikti (CI yeniden derleyince gereksiz commit olmaz)
BUILD=$(cat $(find src -name "*.ts" | sort) index.html style.css static/sw.js static/manifest.webmanifest | sha1sum | cut -c1-10)
sed "s/__BUILD__/$BUILD/" static/sw.js > "$ROOT/app/sw.js"
echo "build $BUILD: $(find "$ROOT/app/js" -name '*.js' | wc -l) js dosyası"
