#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_URL="${APP_URL:-http://localhost:4000}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
PASSWORD="${PASSWORD:-Pass123!}"
LOGIN_PREFIX="${LOGIN_PREFIX:-ai_check}"
LOGIN="${LOGIN:-${LOGIN_PREFIX}_$(date +%s)}"

read_env_value() {
  local key="$1"

  if [[ -f "$ENV_FILE" ]]; then
    awk -F= -v search_key="$key" '
      $1 == search_key {
        value = substr($0, index($0, "=") + 1)
        gsub(/^["'\''"]|["'\''"]$/, "", value)
        print value
        exit
      }
    ' "$ENV_FILE"
  fi
}

require_value() {
  local key="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    echo "Missing required value: $key" >&2
    exit 1
  fi
}

json_get() {
  local json="$1"
  local key="$2"

  node -e '
    const input = process.argv[1];
    const key = process.argv[2];
    const data = JSON.parse(input);
    const value = data[key];

    if (value === undefined || value === null) {
      process.exit(1);
    }

    if (typeof value === "object") {
      process.stdout.write(JSON.stringify(value));
    } else {
      process.stdout.write(String(value));
    }
  ' "$json" "$key"
}

request_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local auth_token="${4:-}"

  local curl_args=(
    -sS
    -X "$method"
    "$url"
    -H "Content-Type: application/json"
  )

  if [[ -n "$auth_token" ]]; then
    curl_args+=(-H "Authorization: Bearer $auth_token")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(-d "$body")
  fi

  curl "${curl_args[@]}"
}

DATABASE_URL="${DATABASE_URL:-$(read_env_value DATABASE_URL)}"
GEMINI_API_KEY="${GEMINI_API_KEY:-$(read_env_value GEMINI_API_KEY)}"

require_value "DATABASE_URL" "$DATABASE_URL"
require_value "GEMINI_API_KEY" "$GEMINI_API_KEY"

echo "Using app: $APP_URL"
echo "Using login: $LOGIN"

echo
echo "1. Signup"
SIGNUP_RESPONSE="$(request_json \
  POST \
  "$APP_URL/auth/signup" \
  "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")"
echo "$SIGNUP_RESPONSE"

echo
echo "2. Promote role to EDITOR"
PROMOTE_SQL="UPDATE \"User\" SET role = 'EDITOR' WHERE login = '$LOGIN';"
printf '%s' "$PROMOTE_SQL" | (
  cd "$ROOT_DIR" &&
    DATABASE_URL="$DATABASE_URL" npx prisma db execute \
      --stdin
)
echo "Role promoted for $LOGIN"

echo
echo "3. Login"
LOGIN_RESPONSE="$(request_json \
  POST \
  "$APP_URL/auth/login" \
  "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")"
TOKEN="$(json_get "$LOGIN_RESPONSE" "accessToken")"
echo "$LOGIN_RESPONSE"

echo
echo "4. Create article"
ARTICLE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/article" \
  '{"title":"AI Integration Smoke Test","content":"This article is used to verify Gemini summarize, translate, analyze, and generate flows from a shell script.","status":"draft","tags":["ai","nestjs","gemini"]}' \
  "$TOKEN")"
ARTICLE_ID="$(json_get "$ARTICLE_RESPONSE" "id")"
echo "$ARTICLE_RESPONSE"
echo "ARTICLE_ID=$ARTICLE_ID"

echo
echo "5. Summarize"
SUMMARIZE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/articles/$ARTICLE_ID/summarize" \
  '{"maxLength":"short"}' \
  "$TOKEN")"
echo "$SUMMARIZE_RESPONSE"

echo
echo "6. Translate"
TRANSLATE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/articles/$ARTICLE_ID/translate" \
  '{"targetLanguage":"Russian"}' \
  "$TOKEN")"
echo "$TRANSLATE_RESPONSE"

echo
echo "7. Analyze"
ANALYZE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/articles/$ARTICLE_ID/analyze" \
  '{"task":"review"}' \
  "$TOKEN")"
echo "$ANALYZE_RESPONSE"

echo
echo "8. Generate"
GENERATE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/generate" \
  '{"prompt":"Give me three short bullet points about NestJS modules.","sessionId":"check-ai-session"}' \
  "$TOKEN")"
echo "$GENERATE_RESPONSE"

echo
echo "9. Usage"
USAGE_RESPONSE="$(request_json \
  GET \
  "$APP_URL/ai/usage" \
  '' \
  "$TOKEN")"
echo "$USAGE_RESPONSE"

echo
echo "AI check completed successfully."
