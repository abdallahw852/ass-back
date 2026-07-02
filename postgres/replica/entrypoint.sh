#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL Streaming Replica Entrypoint
#
# On first boot:
#   1. Waits for the primary to accept replication connections (not just TCP)
#   2. Runs pg_basebackup to clone the primary
#   3. Sets up standby.signal + primary_conninfo
#   4. Starts postgres in hot-standby mode
#
# On subsequent boots (container restart):
#   - PG_VERSION exists in PGDATA → starts postgres directly
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Derive major version from binary (e.g. "18") so this path stays correct
# even if the image is upgraded. PGDATA env var from docker-compose takes precedence.
PG_MAJOR=$(postgres --version 2>/dev/null | awk '{print $3}' | cut -d. -f1)
PGDATA="${PGDATA:-/var/lib/postgresql/${PG_MAJOR}/docker}"
PRIMARY_HOST="${REPLICATION_HOST:-postgres-write}"
PRIMARY_PORT="${REPLICATION_PORT:-5432}"
REPL_USER="${REPLICATION_USER:-replicator}"
REPL_PASS="${REPLICATION_PASSWORD:-replicator}"

# Detect privilege-drop binary (su-exec on Alpine, gosu on Debian-based images)
if command -v su-exec >/dev/null 2>&1; then
  SUEXEC="su-exec"
elif command -v gosu >/dev/null 2>&1; then
  SUEXEC="gosu"
else
  echo "[replica] ERROR: neither su-exec nor gosu found in PATH" >&2
  exit 1
fi

# ── Restart: data already exists ─────────────────────────────────────────────
if [ -f "$PGDATA/PG_VERSION" ]; then
  echo "[replica] Data directory already initialized — starting standby."
  exec $SUEXEC postgres postgres -D "$PGDATA"
fi

# ── First boot: create PGDATA owned by postgres ──────────────────────────────
# Create parent dirs first, then the final dir, so ownership is correct
mkdir -p "$PGDATA"
chown -R postgres:postgres "$(dirname "$PGDATA")"
chmod 700 "$PGDATA"

# ── Wait for primary to accept replication connections ────────────────────────
# pg_isready only checks TCP — we must also confirm the replication user can
# authenticate before attempting pg_basebackup.
echo "[replica] Waiting for primary at $PRIMARY_HOST:$PRIMARY_PORT (max 120s) ..."
WAIT=0
MAX=120
until OUT=$(PGPASSWORD="$REPL_PASS" psql \
    -h "$PRIMARY_HOST" \
    -p "$PRIMARY_PORT" \
    -U "$REPL_USER" \
    -d "postgres" \
    -tAc "SELECT 1" \
    --no-password -q 2>&1); do
  WAIT=$((WAIT + 2))
  if [ "$WAIT" -ge "$MAX" ]; then
    echo "[replica] ERROR: primary did not become ready within ${MAX}s. Last error:"
    echo "$OUT"
    exit 1
  fi
  echo "[replica] Waiting for replication auth/user on primary ... (${WAIT}s elapsed)"
  [ -n "$OUT" ] && echo "[replica] last error: $OUT"
  sleep 2
done
echo "[replica] Primary replication endpoint is ready."

# ── Clone primary via pg_basebackup ──────────────────────────────────────────
echo "[replica] Running pg_basebackup ..."
PGPASSWORD="$REPL_PASS" $SUEXEC postgres pg_basebackup \
  -h "$PRIMARY_HOST" \
  -p "$PRIMARY_PORT" \
  -U "$REPL_USER" \
  -D "$PGDATA" \
  --wal-method=stream \
  --format=plain \
  --progress \
  --checkpoint=fast

# ── Configure standby ─────────────────────────────────────────────────────────
echo "[replica] Configuring standby ..."

# standby.signal tells postgres to start in standby (recovery) mode (PG12+)
$SUEXEC postgres touch "$PGDATA/standby.signal"

# Append to postgresql.auto.conf — this file survives pg_basebackup and
# takes precedence over postgresql.conf for these settings.
# Note: heredoc is intentionally unquoted so variables are expanded.
cat >> "$PGDATA/postgresql.auto.conf" << EOF

# ── Streaming replication (written by replica entrypoint) ──
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPL_USER} password=${REPL_PASS} application_name=asas_replica'
hot_standby = on
hot_standby_feedback = on
EOF

echo "[replica] Standby initialized successfully — starting postgres."
exec $SUEXEC postgres postgres -D "$PGDATA"
