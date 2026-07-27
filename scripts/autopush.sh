#!/bin/bash
# Auto-push to GitHub and trigger Vercel production deploy
set -e

VERCEL_PROJECT_ID="prj_v2YHS2Vuik7xoI6t5koD5TuGCMqB"
VERCEL_ORG_ID="team_BQWnsBcAsW4szAjxsE8X2my1"

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
fi

# ── 2. Trigger Vercel production deploy ──────────────────────────────────────
echo "🚀 Triggering Vercel deploy..."

DEPLOY=$(curl -s -X POST \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v13/deployments?teamId=${VERCEL_ORG_ID}" \
  -d "{
    \"name\": \"smart-fx-tool\",
    \"project\": \"${VERCEL_PROJECT_ID}\",
    \"gitSource\": {
      \"type\": \"github\",
      \"repoId\": \"1203896619\",
      \"ref\": \"main\"
    },
    \"target\": \"production\"
  }")

DEPLOY_URL=$(echo "$DEPLOY" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.url||j.error||'check Vercel dashboard');}catch{console.log('deploy triggered');}})" 2>/dev/null)

echo "✓ Vercel deploy triggered: https://${DEPLOY_URL}"
