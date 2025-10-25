#!/bin/bash
# Deploy script for 3-node FlexSearch cluster

echo "🚀 Deploying FlexSearch 3-node cluster..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.scale.yml down

# Build the application image
echo "🔨 Building application image..."
docker-compose -f docker-compose.yml -f docker-compose.scale.yml build

# Start services with 3 app instances
echo "▶️ Starting services (3 app instances + Nginx LB + MongoDB + Redis)..."
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale app=3

# Wait a moment for services to start
echo "⏳ Waiting for services to initialize..."
sleep 15

# Health checks
echo "🏥 Performing health checks..."

echo "1. Nginx Load Balancer:"
curl -s http://localhost/nginx-health || echo "❌ Nginx not responding"

echo -e "\n2. Application instances via load balancer:"
for i in {1..5}; do
    echo "Request $i:"
    curl -s http://localhost/api/health | jq -r '.nodeName // .nodeId // "No response"' 2>/dev/null || echo "❌ No response"
    sleep 1
done

echo -e "\n3. Redis cache test:"
curl -s "http://localhost/api/search?q=test" | jq '.fromCache' 2>/dev/null || echo "❌ Cache test failed"

echo -e "\n4. Container status:"
docker-compose -f docker-compose.yml -f docker-compose.scale.yml ps

echo -e "\n✅ Deployment complete!"
echo "🌐 Access the application at: http://localhost"
echo "📊 Nginx status: http://localhost/nginx_status (from localhost only)"
echo "🔍 Health check: http://localhost/api/health"

echo -e "\n🧪 Quick test commands:"
echo "# Test load balancing (should show different nodeId/nodeName):"
echo "for i in {1..10}; do curl -s http://localhost/api/health | jq '.nodeName'; done"
echo ""
echo "# Test cache (first slow, then fast):"
echo "time curl -s 'http://localhost/api/search?q=avatar' | jq '.fromCache'"
echo "time curl -s 'http://localhost/api/search?q=avatar' | jq '.fromCache'"