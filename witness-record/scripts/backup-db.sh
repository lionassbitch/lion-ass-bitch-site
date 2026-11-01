#!/usr/bin/env bash
# Logical PostgreSQL backup of THE WITNESS RECORD database.
# Usage: DATABASE_URL=postgres://... ./scripts/backup-db.sh [output-dir]
# Pair with object-storage versioning/replication for media (see docs/DEPLOYMENT.md#backups).
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/witness-record-$STAMP.dump"
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/^"//; s/"$//')"
  fi
fi
[ -n "${DATABASE_URL:-}" ] || { echo "DATABASE_URL is not set" >&2; exit 2; }
pg_dump --format=custom --no-owner --file "$FILE" "$DATABASE_URL"
sha256sum "$FILE" > "$FILE.sha256"
echo "wrote $FILE"
echo "restore test: createdb witness_restore && pg_restore --no-owner -d witness_restore $FILE"
