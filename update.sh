#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  سرزمین عسل — Update Script
#
#  Pulls the latest code from GitHub, rebuilds the site, and restarts
#  services. Run this after changes are pushed to the GitHub repo.
#
#  Usage:  sudo bash /opt/sarzemine-asal/update.sh
#          (or just:  sudo systemctl restart ... + this)
#
#  What it does:
#    1. git pull origin main  (fetch latest code)
#    2. bun install           (in case package.json changed)
#    3. bun install           (bot deps, in case changed)
#    4. prisma generate       (in case schema changed)
#    5. prisma db push        (apply schema changes to DB, preserves data)
#    6. next build            (rebuild the site)
#    7. systemctl restart     (restart site + bot services)
#    8. Health check          (verify everything is back up)
#
#  Data safety:
#    - Orders, products, and customer data are NEVER touched
#    - Only schema migrations are applied (additive — safe)
#    - If build fails, services keep running with old code
# ═══════════════════════════════════════════════════════════════════════

set -Eeuo pipefail

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Config ───────────────────────────────────────────────────────────
INSTALL_DIR="${INSTALL_DIR:-/opt/sarzemine-asal}"
SERVICE_USER="${SERVICE_USER:-sarzemine}"
SITE_PORT="${SITE_PORT:-3000}"
BOT_PORT="${BOT_PORT:-3003}"
BOT_HEALTH_URL="http://localhost:${BOT_PORT}/health"
SITE_URL="http://localhost:${SITE_PORT}"

SERVICE_HOME="/home/${SERVICE_USER}"
BUN_BIN="${SERVICE_HOME}/.bun/bin/bun"

info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }
step()  { echo -e "\n${CYAN}${BOLD}═══ $* ═══${NC}"; }
die()   { err "$*"; exit 1; }

# ── Must run as root ─────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  die "Run as root: sudo bash update.sh"
fi

# ── Verify install exists ────────────────────────────────────────────
if [[ ! -d "$INSTALL_DIR" || ! -f "$INSTALL_DIR/package.json" ]]; then
  die "Installation not found at $INSTALL_DIR.
Run setup.sh first."
fi
ok "Installation found: $INSTALL_DIR"

# ── Verify it's a git repo ──────────────────────────────────────────
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  die "No git repository at $INSTALL_DIR.
The update script requires a git-based deployment (installed via setup.sh with GitHub clone)."
fi
ok "Git repository detected"

cd "$INSTALL_DIR"

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Pre-update backup (safety net)
# ═══════════════════════════════════════════════════════════════════════
step "Step 1/8: Pre-update backup"

BACKUP_DIR="/var/backups/sarzemine-asal"
BACKUP_NAME="pre-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup the database (always — this is the most valuable data)
if [[ -f "$INSTALL_DIR/db/custom.db" ]]; then
  cp "$INSTALL_DIR/db/custom.db" "$BACKUP_DIR/${BACKUP_NAME}-db.db" 2>/dev/null && \
    ok "Database backed up: $BACKUP_DIR/${BACKUP_NAME}-db.db" || \
    warn "Could not backup database (continuing anyway)"
fi

# Keep only the last 10 backups
ls -t "$BACKUP_DIR"/pre-update-*-db.db 2>/dev/null | tail -n +11 | xargs -r rm
ok "Old backups cleaned (keeping last 10)"

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Check for uncommitted local changes (safety)
# ═══════════════════════════════════════════════════════════════════════
step "Step 2/8: Checking local state"

# .env is gitignored, so it won't show as a change. Good.
# But if someone manually edited source files, we warn them.
LOCAL_CHANGES=$(sudo -u "$SERVICE_USER" -H git status --porcelain 2>/dev/null | grep -v "^??" || true)
if [[ -n "$LOCAL_CHANGES" ]]; then
  warn "Local uncommitted changes detected:"
  echo "$LOCAL_CHANGES" | head -10
  echo ""
  read -rp "$(echo -e "${YELLOW} These will be overwritten by git pull. Continue? [y/N]: ${NC}")" CONFIRM
  [[ "${CONFIRM}" =~ ^[Yy]$ ]] || die "Update cancelled."
  # Stash to be safe
  sudo -u "$SERVICE_USER" -H git stash 2>/dev/null || true
  ok "Changes stashed"
else
  ok "No local changes — safe to pull"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: git pull
# ═══════════════════════════════════════════════════════════════════════
step "Step 3/8: Pulling latest code from GitHub"

BEFORE_HASH=$(sudo -u "$SERVICE_USER" -H git rev-parse HEAD 2>/dev/null || echo "unknown")
info "Current commit: ${BEFORE_HASH:0:12}"

info "Fetching latest..."
if ! sudo -u "$SERVICE_USER" -H git fetch origin 2>&1 | tail -3; then
  die "git fetch failed. Check your internet connection and SSH/HTTPS access to GitHub."
fi

info "Pulling changes..."
if ! sudo -u "$SERVICE_USER" -H git pull origin main 2>&1 | tail -5; then
  # Try 'master' branch if 'main' doesn't exist
  info "Trying 'master' branch..."
  if ! sudo -u "$SERVICE_USER" -H git pull origin master 2>&1 | tail -5; then
    die "git pull failed. Check the output above."
  fi
fi

AFTER_HASH=$(sudo -u "$SERVICE_USER" -H git rev-parse HEAD 2>/dev/null || echo "unknown")
info "New commit: ${AFTER_HASH:0:12}"

if [[ "$BEFORE_HASH" == "$AFTER_HASH" ]]; then
  ok "Already up to date — no changes to apply."
  echo ""
  echo -e "${GREEN}${BOLD}✅ Nothing to update. You're on the latest version.${NC}"
  exit 0
fi
ok "Code updated successfully"

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Install dependencies (if package.json changed)
# ═══════════════════════════════════════════════════════════════════════
step "Step 4/8: Checking dependencies"

# Check if package.json or bun.lock changed
if sudo -u "$SERVICE_USER" -H git diff --name-only "$BEFORE_HASH" "$AFTER_HASH" 2>/dev/null | grep -qE "^package.json$|^bun.lock$"; then
  info "package.json changed — reinstalling dependencies..."
  sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' install" 2>&1 | tail -3
  ok "Site dependencies updated"
else
  ok "No dependency changes — skipping install"
fi

# Bot dependencies
if sudo -u "$SERVICE_USER" -H git diff --name-only "$BEFORE_HASH" "$AFTER_HASH" 2>/dev/null | grep -qE "telegram-bot/package.json$|telegram-bot/bun.lock$"; then
  info "Bot package.json changed — reinstalling bot dependencies..."
  sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR/mini-services/telegram-bot' && '$BUN_BIN' install" 2>&1 | tail -3
  ok "Bot dependencies updated"
else
  ok "No bot dependency changes — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Prisma generate + db push (if schema changed)
# ═══════════════════════════════════════════════════════════════════════
step "Step 5/8: Checking database schema"

if sudo -u "$SERVICE_USER" -H git diff --name-only "$BEFORE_HASH" "$AFTER_HASH" 2>/dev/null | grep -qE "prisma/schema.prisma$"; then
  info "Schema changed — regenerating Prisma client..."
  sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' run db:generate" 2>&1 | tail -2
  ok "Prisma client regenerated"

  info "Applying schema changes (data preserved)..."
  sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && DATABASE_URL='file:$INSTALL_DIR/db/custom.db' '$BUN_BIN' run db:push" 2>&1 | tail -3
  ok "Database schema updated (data preserved)"
else
  ok "No schema changes — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Build the site
# ═══════════════════════════════════════════════════════════════════════
step "Step 6/8: Building site"

# Always rebuild — source files may have changed even if package.json didn't
info "Running next build (this may take a minute)..."
if ! sudo -u "$SERVICE_USER" -H bash -c "cd '$INSTALL_DIR' && '$BUN_BIN' run build" 2>&1 | tail -8; then
  err "BUILD FAILED!"
  err "Services are still running with the OLD code (safe state)."
  err "Check the build output above for errors."
  err "Fix the issue, push to GitHub, and run update.sh again."
  die "Update aborted due to build failure."
fi
ok "Site built successfully"

# ═══════════════════════════════════════════════════════════════════════
# STEP 7: Restart services
# ═══════════════════════════════════════════════════════════════════════
step "Step 7/8: Restarting services"

info "Restarting site..."
systemctl restart sarzemine-asal-site
ok "Site service restarted"

info "Restarting bot..."
systemctl restart sarzemine-asal-bot
ok "Bot service restarted"

# ═══════════════════════════════════════════════════════════════════════
# STEP 8: Health verification
# ═══════════════════════════════════════════════════════════════════════
step "Step 8/8: Health verification"

info "Waiting for services to start..."
sleep 5

ALL_OK=true

# Check site
SITE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE_URL" 2>/dev/null || echo "000")
if [[ "$SITE_CODE" == "200" ]]; then
  ok "Website: HTTP 200 ✓"
else
  err "Website: HTTP $SITE_CODE ✗ (may still be starting — check: journalctl -u sarzemine-asal-site -e)"
  ALL_OK=false
fi

# Check bot
sleep 3  # Bot needs a bit more time to start polling
BOT_HEALTH=$(curl -s --max-time 10 "$BOT_HEALTH_URL" 2>/dev/null || echo "")
if echo "$BOT_HEALTH" | grep -q '"ok":true'; then
  if echo "$BOT_HEALTH" | grep -q '"polling":true'; then
    ok "Bot: healthy, polling active ✓"
  else
    warn "Bot: running but polling not yet active (give it 10 seconds)"
  fi
else
  err "Bot: not responding ✗ (check: journalctl -u sarzemine-asal-bot -e)"
  ALL_OK=false
fi

# Check systemd services
for svc in sarzemine-asal-site sarzemine-asal-bot; do
  STATUS=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
  if [[ "$STATUS" == "active" ]]; then
    ok "$svc: active ✓"
  else
    err "$svc: $STATUS ✗"
    ALL_OK=false
  fi
done

# ═══════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
if [[ "$ALL_OK" == "true" ]]; then
  echo -e "${GREEN}${BOLD}  ✅ Update complete! All systems healthy.${NC}"
  echo ""
  echo -e "  ${BOLD}From:${NC} ${BEFORE_HASH:0:12}"
  echo -e "  ${BOLD}To:${NC}   ${AFTER_HASH:0:12}"
  echo ""
  echo -e "  ${BOLD}Commit message:${NC}"
  sudo -u "$SERVICE_USER" -H git log -1 --pretty=format:"%s" 2>/dev/null || echo "(unknown)"
  echo ""
else
  echo -e "${YELLOW}${BOLD}  ⚠️  Code updated but services need a moment.${NC}"
  echo -e "${YELLOW}     Check status: systemctl status sarzemine-asal-*${NC}"
  echo -e "${YELLOW}     View logs:   journalctl -u sarzemine-asal-site -f${NC}"
  echo -e "${YELLOW}                  journalctl -u sarzemine-asal-bot -f${NC}"
  echo ""
  echo -e "  ${BOLD}If services don't recover:${NC}"
  echo -e "  ${YELLOW}  Roll back: sudo -u $SERVICE_USER git -C $INSTALL_DIR reset --hard $BEFORE_HASH && sudo bash update.sh${NC}"
fi
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo ""
