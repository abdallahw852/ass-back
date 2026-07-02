#!/bin/bash
set -e

# This script runs inside the primary container on first boot (docker-entrypoint-initdb.d).
# It creates the replication user and adds the pg_hba.conf replication rule.

REPL_USER="${REPLICATION_USER:-replicator}"
REPL_PASS="${REPLICATION_PASSWORD:-replicator}"

echo "[primary-init] Creating replication user: $REPL_USER"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$REPL_USER') THEN
      CREATE USER $REPL_USER REPLICATION LOGIN ENCRYPTED PASSWORD '$REPL_PASS';
    END IF;
  END
  \$\$;
EOSQL

echo "[primary-init] Allowing replication connections in pg_hba.conf"
# Allow the replicator user to connect for replication from any host on the docker network
echo "host  replication  ${REPL_USER}  all  md5" >> "$PGDATA/pg_hba.conf"

echo "[primary-init] Reloading pg_hba.conf"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "SELECT pg_reload_conf();"

echo "[primary-init] Done."
