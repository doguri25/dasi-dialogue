#!/bin/zsh
cd "${0:A:h}" || exit 1
node_bin="$(command -v node)"
if [[ -z "$node_bin" ]]; then
  node_candidates=("$HOME"/.nvm/versions/node/*/bin/node(N))
  node_bin="${node_candidates[-1]}"
fi
if [[ -z "$node_bin" || ! -x "$node_bin" ]]; then
  print 'Node.js 22 이상을 설치한 뒤 다시 실행해 주세요.'
  read -r '?Enter를 누르면 닫힙니다.'
  exit 1
fi
print '브라우저에서 http://localhost:3210 을 여세요.'
print '종료하려면 이 창에서 Control+C를 누르세요.'
exec "$node_bin" server.mjs
