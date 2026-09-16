#!/bin/bash
# =========================================================
#  OSIRIS — Deploy Cycle Script
#  Git → SSH → Docker Rebuild → Live
# =========================================================
#
#  Usage (from your local osiris project directory):
#    bash deploy.sh                  # deploys current staged changes
#    bash deploy.sh "commit message" # deploys with custom commit message
#
# =========================================================

set -e

# --- Configuration ---
SERVER="root@100.89.48.10"
REMOTE_DIR="/root/osiris"
BRANCH="master"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     OSIRIS DEPLOYMENT CYCLE              ║${NC}"
echo -e "${CYAN}║     Git → SSH → Docker → Live            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# --- STEP 1: Git Commit & Push ---
echo -e "${YELLOW}[1/2] GIT — Staging & Pushing...${NC}"
git add -A

COMMIT_MSG="${1:-deploy: update osiris production $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$COMMIT_MSG" || echo -e "${YELLOW}  (nothing new to commit)${NC}"

git push origin "$BRANCH"
echo -e "${GREEN}  ✓ Pushed to origin/$BRANCH${NC}"
echo ""

# --- STEP 2: SSH — Pull & Docker Rebuild ---
echo -e "${YELLOW}[2/2] SERVER — Pulling & Rebuilding Docker...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && git pull && docker-compose down && docker-compose up -d --build"
echo -e "${GREEN}  ✓ Docker rebuilt and running${NC}"
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ✅ DEPLOYMENT COMPLETE               ║${NC}"
echo -e "${CYAN}║     https://osirisai.live is live         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
