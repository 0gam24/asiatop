#!/usr/bin/env bash
# 내부 링크 trailing slash + 실존 페이지 + <title>/<meta description> 게이트 래퍼
# (네이버 서치어드바이저 진단 대응 2026-09-05).
# 실제 구현: scripts/audit/internal-links.mjs (크로스플랫폼 node). 빌드 후 실행:
#   corepack pnpm build && bash scripts/check-trailing-slash.sh
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/audit/internal-links.mjs "$@"
