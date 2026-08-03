#!/usr/bin/env bash
# Push LocalFix SA to your GitHub repository.
#
# Usage:
#   ./scripts/push-to-github.sh <your-github-username>/<repo-name> [github-token]
#
# Examples:
#   ./scripts/push-to-github.sh janedoe/localfix-sa
#   ./scripts/push-to-github.sh janedoe/localfix-sa ghp_xxxxxxxxxxxx
#
# Or with the token in the environment:
#   GITHUB_TOKEN=ghp_xxx ./scripts/push-to-github.sh janedoe/localfix-sa
#
# If the repository doesn't exist yet and a token with `repo` scope is
# provided, it will be created automatically (private).
set -euo pipefail

TARGET="${1:?Usage: $0 <owner>/<repo> [token]}"
TOKEN="${2:-${GITHUB_TOKEN:-}}"

if [[ "$TARGET" != */* ]]; then
  echo "✖ Expected <owner>/<repo>, got: $TARGET" >&2
  exit 1
fi

OWNER="${TARGET%%/*}"; REPO="${TARGET#*/}"
cd "$(dirname "$0")/.."

# Create the repo on GitHub if a token is available and repo is missing
if [[ -n "$TOKEN" ]] && ! git ls-remote "https://github.com/${TARGET}.git" HEAD &>/dev/null; then
  echo "→ Creating github.com/${TARGET} (private)…"
  curl -sS -X POST https://api.github.com/user/repos \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -d "{\"name\":\"${REPO}\",\"private\":true}" >/dev/null
fi

if [[ -n "$TOKEN" ]]; then
  REMOTE="https://x-access-token:${TOKEN}@github.com/${TARGET}.git"
else
  # Fall back to SSH (requires your key to be added to GitHub)
  REMOTE="git@github.com:${TARGET}.git"
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git branch -M main
git push -u origin main

echo
echo "✓ Pushed to https://github.com/${TARGET}"
