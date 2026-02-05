#!/bin/bash

# Telegram Bot Diagnostic Script
# Usage: ./telegram-diagnose.sh <VERCEL_DOMAIN> <BOT_TOKEN>

DOMAIN="${1:-v0-birthday-reminder-app-liart.vercel.app}"
BOT_TOKEN="${2:-8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg}"

echo "🔍 Telegram Bot Diagnostics"
echo "================================"
echo "Domain: $DOMAIN"
echo "Bot Token: ${BOT_TOKEN:0:10}..."
echo ""

# Check 1: Webhook Status
echo "1️⃣  Checking Webhook Status..."
WEBHOOK=$(curl -s -X GET "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq '.result.url // empty')
if [ -z "$WEBHOOK" ]; then
  echo "❌ No webhook configured"
else
  echo "✅ Webhook URL: $WEBHOOK"
fi
echo ""

# Check 2: Set Webhook if needed
echo "2️⃣  Setting Webhook (if not correct)..."
WEBHOOK_RESULT=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://$DOMAIN/api/telegram/webhook\"}")
echo "Result: $(echo $WEBHOOK_RESULT | jq '.description // .ok')"
echo ""

# Check 3: Test webhook endpoint
echo "3️⃣  Testing Webhook Endpoint..."
WEBHOOK_TEST=$(curl -s -X POST "https://$DOMAIN/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -d '{"update_id": 123456789, "message": {"message_id": 1, "from": {"id": 999, "is_bot": false, "first_name": "Test"}, "chat": {"id": 999, "first_name": "Test", "type": "private"}, "date": 1234567890, "text": "/help"}}' \
  2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Webhook endpoint accessible"
  echo "Response: $(echo $WEBHOOK_TEST | jq '.ok // .error // .')"
else
  echo "❌ Webhook endpoint not accessible"
fi
echo ""

# Check 4: Get Bot Info
echo "4️⃣  Bot Information..."
BOT_INFO=$(curl -s -X GET "https://api.telegram.org/bot$BOT_TOKEN/getMe" | jq '.result')
echo "Bot: $(echo $BOT_INFO | jq '.first_name')"
echo "Username: $(echo $BOT_INFO | jq '.username')"
echo "ID: $(echo $BOT_INFO | jq '.id')"
echo ""

echo "================================"
echo "✅ Diagnostics Complete"
echo ""
echo "Next steps:"
echo "1. Start bot in Telegram: /start"
echo "2. Get linking code from bot"
echo "3. Enter code in app to link account"
echo "4. Test message: curl https://$DOMAIN/api/telegram/test -X POST -H 'Content-Type: application/json' -d '{\"userId\": \"YOUR_USER_ID\"}'"
