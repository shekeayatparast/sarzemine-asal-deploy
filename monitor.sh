#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
#  monitor.sh — Health monitor for سرزمین عسل (Honey Land)
#
#  Checks:
#    1. Website (HTTP 200 on localhost:3000)
#    2. Telegram bot (health endpoint on localhost:3003)
#    3. systemd services (site + bot are active)
#    4. Disk space (warn if > 90%)
#    5. Memory usage (warn if > 90%)
#
#  On any failure: sends a Telegram alert to the admin and logs to file.
#  Designed to run via systemd timer every 5 minutes.
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config (read from .env) ──────────────────────────────────────────
ENV_FILE="/opt/sarzemine-asal/.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

SITE_URL="${SITE_URL:-http://localhost:3000}"
BOT_HEALTH_URL="${BOT_HEALTH_URL:-http://localhost:3003/health}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
ADMIN_ID="${TELEGRAM_ADMIN_ID:-}"

LOG_DIR="/var/log/sarzemine-asal"
LOG_FILE="$LOG_DIR/monitor.log"
ALERT_COOLDOWN_FILE="$LOG_DIR/.alert-cooldown"
ALERT_COOLDOWN_SEC=900  # 15 minutes — don't spam alerts

mkdir -p "$LOG_DIR" 2>/dev/null || true

# ── Helpers ──────────────────────────────────────────────────────────
timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

log() {
  local msg="[$(timestamp)] $*"
  echo "$msg"
  [[ -d "$LOG_DIR" ]] && echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

send_telegram() {
  local msg="$1"
  [[ -z "$BOT_TOKEN" || -z "$ADMIN_ID" ]] && return 0
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ADMIN_ID}" \
    -d "text=${msg}" \
    -d "parse_mode=HTML" \
    --max-time 10 >/dev/null 2>&1 || true
}

should_alert() {
  # Check cooldown — only send alert if last one was > cooldown ago
  if [[ -f "$ALERT_COOLDOWN_FILE" ]]; then
    local last
    last=$(cat "$ALERT_COOLDOWN_FILE" 2>/dev/null || echo 0)
    local now
    now=$(date +%s)
    if (( now - last < ALERT_COOLDOWN_SEC )); then
      return 1  # still in cooldown, don't alert
    fi
  fi
  return 0  # ok to alert
}

mark_alerted() {
  [[ -d "$LOG_DIR" ]] && date +%s > "$ALERT_COOLDOWN_FILE" 2>/dev/null || true
}

# ── Health checks ────────────────────────────────────────────────────
ERRORS=()
WARNINGS=()

# 1. Website check
SITE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SITE_URL" 2>/dev/null || echo "000")
if [[ "$SITE_CODE" == "200" ]]; then
  log "✅ Website: OK (HTTP $SITE_CODE)"
else
  ERRORS+=("Website returned HTTP $SITE_CODE (expected 200)")
  log "❌ Website: FAIL (HTTP $SITE_CODE)"
fi

# 2. Bot health check
BOT_RESPONSE=$(curl -s --max-time 10 "$BOT_HEALTH_URL" 2>/dev/null || echo "")
BOT_OK=$(echo "$BOT_RESPONSE" | grep -o '"ok":true' || echo "")
if [[ -n "$BOT_OK" ]]; then
  BOT_POLLING=$(echo "$BOT_RESPONSE" | grep -o '"polling":true' || echo "")
  if [[ -n "$BOT_POLLING" ]]; then
    log "✅ Bot: OK (polling active)"
  else
    WARNINGS+=("Bot health OK but polling not active")
    log "⚠️  Bot: OK but polling NOT active"
  fi
else
  ERRORS+=("Bot health endpoint unreachable or returned error")
  log "❌ Bot: FAIL (no health response)"
fi

# 3. systemd services (only if running under root or with systemd)
if command -v systemctl &>/dev/null; then
  for svc in sarzemine-asal-site sarzemine-asal-bot; do
    STATUS=$(systemctl is-active "$svc" 2>/dev/null || echo "unknown")
    if [[ "$STATUS" == "active" ]]; then
      log "✅ Service $svc: active"
    else
      ERRORS+=("Service $svc is '$STATUS' (expected active)")
      log "❌ Service $svc: $STATUS"
    fi
  done
fi

# 4. Disk space
DISK_PCT=$(df / | awk 'NR==2{gsub(/%/,""); print $5}')
if [[ -n "$DISK_PCT" && "$DISK_PCT" -gt 90 ]]; then
  ERRORS+=("Disk usage at ${DISK_PCT}% (critical)")
  log "❌ Disk: ${DISK_PCT}% used (CRITICAL)"
elif [[ -n "$DISK_PCT" && "$DISK_PCT" -gt 80 ]]; then
  WARNINGS+=("Disk usage at ${DISK_PCT}%")
  log "⚠️  Disk: ${DISK_PCT}% used"
else
  log "✅ Disk: ${DISK_PCT}% used"
fi

# 5. Memory
MEM_PCT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
if [[ -n "$MEM_PCT" && "$MEM_PCT" -gt 90 ]]; then
  WARNINGS+=("Memory usage at ${MEM_PCT}%")
  log "⚠️  Memory: ${MEM_PCT}% used"
else
  log "✅ Memory: ${MEM_PCT}% used"
fi

# ── Summary & alerts ─────────────────────────────────────────────────
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  log "═══ CHECK FAILED: ${#ERRORS[@]} error(s), ${#WARNINGS[@]} warning(s) ═══"
  if should_alert; then
    ALERT_MSG="🚨 <b>هشدار سرزمین عسل</b>%0A%0A"
    ALERT_MSG+="❌ <b>مشکلات:</b>%0A"
    for e in "${ERRORS[@]}"; do
      ALERT_MSG+="• ${e}%0A"
    done
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
      ALERT_MSG+="%0A⚠️ <b>هشدارها:</b>%0A"
      for w in "${WARNINGS[@]}"; do
        ALERT_MSG+="• ${w}%0A"
      done
    fi
    ALERT_MSG+="%0A🕐 $(timestamp)"
    send_telegram "$ALERT_MSG"
    mark_alerted
    log "📢 Telegram alert sent"
  else
    log "🔇 Alert in cooldown — not sending"
  fi
  exit 1
elif [[ ${#WARNINGS[@]} -gt 0 ]]; then
  log "═══ CHECK PASSED with ${#WARNINGS[@]} warning(s) ═══"
  exit 0
else
  log "═══ ALL CHECKS PASSED ═══"
  exit 0
fi
