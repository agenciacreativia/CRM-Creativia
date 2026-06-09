#!/usr/bin/env bash
# Después de que el workflow QA termine, este script:
# 1. typecheck
# 2. si OK: build local (sanity check)
# 3. commit + push
# 4. da instrucciones de deploy en Lightsail
set -euo pipefail
cd /d/CREATIVIA/CRM-CREATIVIA-TURISTEA/apps/web

echo "==> Typecheck"
npx tsc --noEmit

echo "==> Cambios git status"
cd /d/CREATIVIA/CRM-CREATIVIA-TURISTEA
git status -s | wc -l
git status -s | head -30

echo
echo "Próximo paso manual:"
echo "  git add -A"
echo "  git commit -m 'QA Lote final — fixes medios y bajos via workflow paralelo'"
echo "  git push origin main"
echo
echo "Deploy Lightsail:"
echo "  ssh ubuntu@54.198.90.145"
echo "  cd ~/CRM-Creativia && git pull && cd apps/web && \\"
echo "    set -a; source .env.production.local; set +a && \\"
echo "    rm -rf .next && npm run build && pm2 restart turistea-crm --update-env"
