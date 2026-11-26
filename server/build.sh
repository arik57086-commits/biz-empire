#!/bin/sh
# собирает worker.js: куски экономики из index.html (между //@econ{ и //@econ}) + код сервера
GAME="$1"; OUT="$2"; DIR="$(dirname "$0")"
{
  echo "// Кубитал — сервер. Собрано автоматически: данные экономики из index.html + server.js"
  awk '/^\/\/@econ\{/{on=1;next} /^\/\/@econ\}/{on=0;next} on' "$GAME"
  cat "$DIR/server.js"
} > "$OUT"
