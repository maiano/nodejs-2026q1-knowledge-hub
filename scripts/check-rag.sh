#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_URL="${APP_URL:-http://localhost:4000}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
PASSWORD="${PASSWORD:-Pass123!}"
LOGIN_PREFIX="${LOGIN_PREFIX:-rag_check}"
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

json_array_length() {
  local json="$1"
  local key="$2"

  node -e '
    const input = process.argv[1];
    const key = process.argv[2];
    const data = JSON.parse(input);
    const value = data[key];

    if (!Array.isArray(value)) {
      process.exit(1);
    }

    process.stdout.write(String(value.length));
  ' "$json" "$key"
}

json_root_array_length() {
  local json="$1"

  node -e '
    const input = process.argv[1];
    const data = JSON.parse(input);

    if (!Array.isArray(data)) {
      process.exit(1);
    }

    process.stdout.write(String(data.length));
  ' "$json"
}

json_array_has_article() {
  local json="$1"
  local array_key="$2"
  local article_id="$3"

  node -e '
    const input = process.argv[1];
    const arrayKey = process.argv[2];
    const articleId = process.argv[3];
    const data = JSON.parse(input);
    const value = data[arrayKey];

    if (!Array.isArray(value)) {
      process.exit(1);
    }

    const hasArticle = value.some(
      (item) => item && typeof item === "object" && item.articleId === articleId,
    );

    process.stdout.write(hasArticle ? "true" : "false");
  ' "$json" "$array_key" "$article_id"
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

request_with_status() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local auth_token="${4:-}"

  local tmp_file
  tmp_file="$(mktemp)"
  trap 'rm -f "$tmp_file"' RETURN

  local curl_args=(
    -sS
    -o "$tmp_file"
    -w "%{http_code}"
    -X "$method"
    "$url"
  )

  if [[ -n "$auth_token" ]]; then
    curl_args+=(-H "Authorization: Bearer $auth_token")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local status
  status="$(curl "${curl_args[@]}")"
  local response_body
  response_body="$(cat "$tmp_file")"

  printf '%s\n%s' "$status" "$response_body"
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "Assertion failed for $label: expected '$expected', got '$actual'" >&2
    exit 1
  fi
}

assert_greater_than_zero() {
  local value="$1"
  local label="$2"

  if ! [[ "$value" =~ ^[0-9]+$ ]] || (( value < 1 )); then
    echo "Assertion failed for $label: expected integer > 0, got '$value'" >&2
    exit 1
  fi
}

DATABASE_URL="${DATABASE_URL:-$(read_env_value DATABASE_URL)}"
GEMINI_API_KEY="${GEMINI_API_KEY:-$(read_env_value GEMINI_API_KEY)}"

require_value "DATABASE_URL" "$DATABASE_URL"
require_value "GEMINI_API_KEY" "$GEMINI_API_KEY"

echo "Using app: $APP_URL"
echo "Using login: $LOGIN"

echo
echo "1. Health"
HEALTH_RESPONSE="$(request_json GET "$APP_URL/health")"
echo "$HEALTH_RESPONSE"

echo
echo "2. Signup"
SIGNUP_RESPONSE="$(request_json \
  POST \
  "$APP_URL/auth/signup" \
  "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")"
echo "$SIGNUP_RESPONSE"

echo
echo "3. Promote role to EDITOR"
PROMOTE_SQL="UPDATE \"User\" SET role = 'EDITOR' WHERE login = '$LOGIN';"
printf '%s' "$PROMOTE_SQL" | (
  cd "$ROOT_DIR" &&
    DATABASE_URL="$DATABASE_URL" npx prisma db execute --stdin
)
echo "Role promoted for $LOGIN"

echo
echo "4. Login"
LOGIN_RESPONSE="$(request_json \
  POST \
  "$APP_URL/auth/login" \
  "{\"login\":\"$LOGIN\",\"password\":\"$PASSWORD\"}")"
TOKEN="$(json_get "$LOGIN_RESPONSE" "accessToken")"
echo "$LOGIN_RESPONSE"

echo
echo "5. Create published article"
ARTICLE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/article" \
  '{"title":"RAG Integration Smoke Test","content":"Retrieval-augmented generation uses embeddings, vector search, and grounded answers. Qdrant stores vectors, and Gemini is used for embeddings and final generation in this project.","status":"published","tags":["rag","nestjs","qdrant"]}' \
  "$TOKEN")"
ARTICLE_ID="$(json_get "$ARTICLE_RESPONSE" "id")"
echo "$ARTICLE_RESPONSE"
echo "ARTICLE_ID=$ARTICLE_ID"

echo
echo "6. Build index"
INDEX_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/rag/index" \
  "{\"onlyPublished\":true,\"articleIds\":[\"$ARTICLE_ID\"]}" \
  "$TOKEN")"
INDEXED_ARTICLES="$(json_get "$INDEX_RESPONSE" "indexedArticles")"
INDEXED_CHUNKS="$(json_get "$INDEX_RESPONSE" "indexedChunks")"
echo "$INDEX_RESPONSE"
assert_greater_than_zero "$INDEXED_ARTICLES" "indexedArticles"
assert_greater_than_zero "$INDEXED_CHUNKS" "indexedChunks"

echo
echo "7. Search"
SEARCH_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/rag/search" \
  '{"query":"How does Qdrant help RAG in this project?","limit":5}' \
  "$TOKEN")"
SEARCH_RESULTS_COUNT="$(json_array_length "$SEARCH_RESPONSE" "results")"
SEARCH_HAS_ARTICLE="$(json_array_has_article "$SEARCH_RESPONSE" "results" "$ARTICLE_ID")"
echo "$SEARCH_RESPONSE"
assert_greater_than_zero "$SEARCH_RESULTS_COUNT" "search results"
assert_equals "$SEARCH_HAS_ARTICLE" "true" "search contains indexed article"

echo
echo "8. Chat"
CHAT_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/rag/chat" \
  '{"question":"Explain how embeddings and Qdrant work together in this project."}' \
  "$TOKEN")"
CONVERSATION_ID="$(json_get "$CHAT_RESPONSE" "conversationId")"
CHAT_SOURCES_COUNT="$(json_array_length "$CHAT_RESPONSE" "sources")"
CHAT_HAS_ARTICLE="$(json_array_has_article "$CHAT_RESPONSE" "sources" "$ARTICLE_ID")"
echo "$CHAT_RESPONSE"
assert_greater_than_zero "$CHAT_SOURCES_COUNT" "chat sources"
assert_equals "$CHAT_HAS_ARTICLE" "true" "chat contains indexed article source"

echo
echo "9. History"
HISTORY_RESPONSE="$(request_json \
  GET \
  "$APP_URL/ai/rag/chat/$CONVERSATION_ID/history" \
  '' \
  "$TOKEN")"
HISTORY_COUNT="$(json_root_array_length "$HISTORY_RESPONSE")"
echo "$HISTORY_RESPONSE"
assert_greater_than_zero "$HISTORY_COUNT" "conversation history"

echo
echo "10. Delete article index"
DELETE_RESULT="$(request_with_status \
  DELETE \
  "$APP_URL/ai/rag/index/articles/$ARTICLE_ID" \
  '' \
  "$TOKEN")"
DELETE_STATUS="$(printf '%s' "$DELETE_RESULT" | head -n 1)"
DELETE_BODY="$(printf '%s' "$DELETE_RESULT" | tail -n +2)"
echo "HTTP $DELETE_STATUS"
if [[ -n "$DELETE_BODY" ]]; then
  echo "$DELETE_BODY"
fi
assert_equals "$DELETE_STATUS" "204" "delete status"

echo
echo "11. Search after delete"
SEARCH_AFTER_DELETE_RESPONSE="$(request_json \
  POST \
  "$APP_URL/ai/rag/search" \
  '{"query":"How does Qdrant help RAG in this project?","limit":5}' \
  "$TOKEN")"
SEARCH_AFTER_DELETE_HAS_ARTICLE="$(json_array_has_article \
  "$SEARCH_AFTER_DELETE_RESPONSE" \
  "results" \
  "$ARTICLE_ID")"
echo "$SEARCH_AFTER_DELETE_RESPONSE"
assert_equals \
  "$SEARCH_AFTER_DELETE_HAS_ARTICLE" \
  "false" \
  "search excludes deleted article"

echo
echo "RAG check completed successfully."
