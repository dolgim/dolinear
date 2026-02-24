#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get current git branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

# Sanitize branch name for use as a DB name:
#   - Take only the part after the last '/' (e.g., feature/auth -> auth)
#   - Replace non-alphanumeric characters with '_'
#   - Collapse consecutive underscores
#   - Remove leading/trailing underscores
#   - Lowercase everything
DB_SUFFIX=$(echo "$BRANCH" | sed 's|.*/||' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')

DB_NAME="dolinear_${DB_SUFFIX}"

# PostgreSQL connection defaults (can be overridden via environment)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"

# Docker compose service name
DB_SERVICE="${DB_SERVICE:-db}"

echo "Branch:   $BRANCH"
echo "DB name:  $DB_NAME"

# Determine the docker compose container
CONTAINER=$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps -q "$DB_SERVICE" 2>/dev/null || true)
if [ -z "$CONTAINER" ]; then
  echo "Error: PostgreSQL container is not running. Start it with 'pnpm db:up'" >&2
  exit 1
fi

# Create database if it doesn't exist (run psql inside the container)
if docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  echo "Database '$DB_NAME' already exists."
else
  docker exec "$CONTAINER" psql -U "$PGUSER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"
  echo "Database '$DB_NAME' created."
fi

# Build the new DATABASE_URL
DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${DB_NAME}"

# Helper: update or add DATABASE_URL in an .env file
update_env_file() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    if grep -q '^DATABASE_URL=' "$env_file"; then
      sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$env_file"
      rm -f "$env_file.bak"
    else
      echo "DATABASE_URL=${DATABASE_URL}" >> "$env_file"
    fi
  else
    echo "DATABASE_URL=${DATABASE_URL}" > "$env_file"
  fi
  echo "  Updated $env_file"
}

# Update .env in project root and apps/api (drizzle/dotenv reads from CWD)
echo ""
echo "Updating .env files with DATABASE_URL=${DATABASE_URL}"
update_env_file "$PROJECT_ROOT/.env"
update_env_file "$PROJECT_ROOT/apps/api/.env"
