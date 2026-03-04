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

# Derive portless suffix (hyphens instead of underscores, suitable for hostnames)
# For 'main' branch: empty (no suffix)
if [ "$BRANCH" = "main" ]; then
  PORTLESS_SUFFIX=""
else
  PORTLESS_SUFFIX=$(echo "$BRANCH" | sed 's|.*/||' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
fi

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

# Helper: update or add a KEY=VALUE in an .env file
set_env_var() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  if [ -f "$env_file" ]; then
    if grep -q "^${key}=" "$env_file"; then
      sed -i.bak "s|^${key}=.*|${key}=${value}|" "$env_file"
      rm -f "$env_file.bak"
    else
      echo "${key}=${value}" >> "$env_file"
    fi
  else
    echo "${key}=${value}" > "$env_file"
  fi
}

# Update .env in project root, apps/api, and apps/web
echo ""
echo "Updating .env files..."
echo "  DATABASE_URL=${DATABASE_URL}"
echo "  PORTLESS_SUFFIX=${PORTLESS_SUFFIX:-<empty>}"

for env_file in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/apps/api/.env" "$PROJECT_ROOT/apps/web/.env"; do
  set_env_var "$env_file" "DATABASE_URL" "$DATABASE_URL"
  set_env_var "$env_file" "PORTLESS_SUFFIX" "$PORTLESS_SUFFIX"
  echo "  Updated $env_file"
done
