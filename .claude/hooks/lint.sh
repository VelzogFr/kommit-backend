#!/usr/bin/env bash
# Hook Stop : lance ESLint sur le repo quand Claude rend la main.
# Si le lint échoue, renvoie les erreurs à Claude pour qu'il les corrige.

set -uo pipefail

payload=$(cat)

# Claude est déjà reparti à cause de ce hook : ne pas reboucler indéfiniment.
if printf '%s' "$payload" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

repo_root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$repo_root" || exit 0

lint_output=$(pnpm lint 2>&1)
lint_status=$?

if [ "$lint_status" -eq 0 ]; then
  exit 0
fi

printf 'pnpm lint a échoué :\n\n%s' "$lint_output" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify({decision:"block",reason:s})))'
