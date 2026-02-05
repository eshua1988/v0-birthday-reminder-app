param(
    [string]$Domain = "v0-birthday-reminder-app-liart.vercel.app",
    [string]$BotToken = "8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg"
)

Write-Host "`n🔍 Telegram Bot Diagnostics`n" -ForegroundColor Green

# Check 1: Webhook Status
Write-Host "1. Checking Webhook Status..." -ForegroundColor Cyan
$webhook = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/getWebhookInfo" -UseBasicParsing | ConvertFrom-Json
if ($webhook.result.url) {
    Write-Host "✅ Webhook: $($webhook.result.url)`n" -ForegroundColor Green
} else {
    Write-Host "❌ No webhook set`n" -ForegroundColor Red
}

# Check 2: Set Webhook
Write-Host "2. Setting Webhook..." -ForegroundColor Cyan
$result = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
    -Method POST -ContentType "application/json" `
    -Body (@{url = "https://$Domain/api/telegram/webhook"} | ConvertTo-Json) `
    -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ $($result.description)`n" -ForegroundColor Green

# Check 3: Bot Info
Write-Host "3. Bot Information..." -ForegroundColor Cyan
$botInfo = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/getMe" -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ Bot: $($botInfo.result.first_name) (@$($botInfo.result.username))`n" -ForegroundColor Green

Write-Host "================================" -ForegroundColor Green
Write-Host "Setup Instructions:" -ForegroundColor Yellow
Write-Host "1. Send /start to the Birthday Reminder Bot in Telegram"
Write-Host "2. Copy the linking code"
Write-Host "3. Open Birthday Reminder App"
Write-Host "4. Paste code and connect Telegram"
Write-Host "5. Add a birthday for today to test"
Write-Host "`n"
