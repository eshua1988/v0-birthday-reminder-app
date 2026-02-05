$BotToken = "8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg"
$Domain = "v0-birthday-reminder-app-liart.vercel.app"

Write-Host "Telegram Bot Diagnostics" -ForegroundColor Green
Write-Host ""

# Check 1: Webhook Status
Write-Host "1. Checking Webhook Status..." -ForegroundColor Cyan
try {
    $webhook = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/getWebhookInfo" -UseBasicParsing | ConvertFrom-Json
    if ($webhook.result.url) {
        Write-Host "Webhook: $($webhook.result.url)" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking webhook" -ForegroundColor Red
}
Write-Host ""

# Check 2: Set Webhook
Write-Host "2. Setting Webhook..." -ForegroundColor Cyan
try {
    $body = @{ url = "https://$Domain/api/telegram/webhook" } | ConvertTo-Json
    $result = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/setWebhook" `
        -Method POST -ContentType "application/json" `
        -Body $body -UseBasicParsing | ConvertFrom-Json
    Write-Host "Result: $($result.description)" -ForegroundColor Green
} catch {
    Write-Host "Error setting webhook" -ForegroundColor Red
}
Write-Host ""

# Check 3: Bot Info
Write-Host "3. Getting Bot Information..." -ForegroundColor Cyan
try {
    $botInfo = Invoke-WebRequest -Uri "https://api.telegram.org/bot$BotToken/getMe" -UseBasicParsing | ConvertFrom-Json
    Write-Host "Bot: $($botInfo.result.first_name)" -ForegroundColor Green
} catch {
    Write-Host "Error getting bot info" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
