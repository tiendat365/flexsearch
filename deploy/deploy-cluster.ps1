# PowerShell deployment script for Windows
# Deploy FlexSearch 3-node cluster

Write-Host "🚀 Deploying FlexSearch 3-node cluster..." -ForegroundColor Green

# Stop existing containers
Write-Host "📦 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.scale.yml down

# Build the application image
Write-Host "🔨 Building application image..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.scale.yml build

# Start services with 3 app instances
Write-Host "▶️ Starting services (3 app instances + Nginx LB + MongoDB + Redis)..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale app=3

# Wait for services to start
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Health checks
Write-Host "🏥 Performing health checks..." -ForegroundColor Cyan

Write-Host "1. Nginx Load Balancer:" -ForegroundColor White
try {
    $nginxHealth = Invoke-RestMethod -Uri "http://localhost/nginx-health" -TimeoutSec 5
    Write-Host "✅ Nginx OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Nginx not responding" -ForegroundColor Red
}

Write-Host "`n2. Application instances via load balancer:" -ForegroundColor White
for ($i = 1; $i -le 5; $i++) {
    Write-Host "Request $i:" -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "http://localhost/api/health" -TimeoutSec 5
        Write-Host " $($response.nodeName)" -ForegroundColor Green
    } catch {
        Write-Host " ❌ No response" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

Write-Host "`n3. Redis cache test:" -ForegroundColor White
try {
    $searchResponse = Invoke-RestMethod -Uri "http://localhost/api/search?q=test" -TimeoutSec 10
    if ($searchResponse.fromCache -ne $null) {
        Write-Host "✅ Cache system working (fromCache: $($searchResponse.fromCache))" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Cache response unclear" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Cache test failed" -ForegroundColor Red
}

Write-Host "`n4. Container status:" -ForegroundColor White
docker-compose -f docker-compose.yml -f docker-compose.scale.yml ps

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Access the application at: http://localhost" -ForegroundColor Cyan
Write-Host "🔍 Health check: http://localhost/api/health" -ForegroundColor Cyan

Write-Host "`n🧪 Quick test commands:" -ForegroundColor Magenta
Write-Host "# Test load balancing (should show different nodeId/nodeName):" -ForegroundColor Gray
Write-Host "for (`$i = 1; `$i -le 10; `$i++) { (Invoke-RestMethod 'http://localhost/api/health').nodeName }" -ForegroundColor White

Write-Host "`n# Test cache (first slow, then fast):" -ForegroundColor Gray  
Write-Host "Measure-Command { Invoke-RestMethod 'http://localhost/api/search?q=avatar' }" -ForegroundColor White
Write-Host "Measure-Command { Invoke-RestMethod 'http://localhost/api/search?q=avatar' }" -ForegroundColor White