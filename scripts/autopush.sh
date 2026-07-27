#!/bin/bash
# Auto-push to GitHub — Vercel deploy is triggered automatically via GitHub Actions (.github/workflows/deploy.yml)
set -e

# ── 1. Git push ──────────────────────────────────────────────────────────────
git remote set-url origin https://${GITHUB_TOKEN}@github.com/developercharloh/Smart-FX-Tool.git

git add -A

if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit — working tree clean."
else
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  git commit -m "Auto-push: ${TIMESTAMP}"
  git push origin main
  echo "✓ Pushed to GitHub at ${TIMESTAMP}"
  echo "🚀 Vercel deploy will trigger automatically via GitHub Actions"
fi
