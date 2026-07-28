#!/bin/bash
# Auto-push to GitHub and trigger Vercel production deploy
set -e

VERCEL_PROJECT_ID="prj_v2YHS2Vuik7xoI6t5koD5TuGCMqB"
VERCEL_API_PROJECT_ID="prj_lg81RbvQA8e9102PnyTeU9JMaa1E"
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

deploy_project() {
  local NAME=$1
  local PROJECT_ID=$2
  local RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com/v13/deployments?teamId=${VERCEL_ORG_ID}" \
    -d "{
      \"name\": \"${NAME}\",
      \"project\": \"${PROJECT_ID}\",
      \"gitSource\": {
        \"type\": \"github\",
        \"repoId\": \"1203896619\",
        \"ref\": \"main\"
      },
      \"target\": \"production\"
    }")
  local URL=$(echo "$RESULT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.url||j.error||'check Vercel');}catch{console.log('triggered');}})" 2>/dev/null)
  echo "✓ $NAME: https://${URL}"
}

# ── 2. Deploy frontend + API server in parallel ──────────────────────────────
echo "🚀 Triggering Vercel deploys..."
deploy_project "smart-fx-tool"            "${VERCEL_PROJECT_ID}"     &
deploy_project "smart-fx-tool-api-server" "${VERCEL_API_PROJECT_ID}" &
wait
echo "✓ Both deployments triggered"
