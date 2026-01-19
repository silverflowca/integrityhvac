#!/bin/bash

# Test Docker with Railway-like environment variables
# This simulates what Railway does

echo "🧪 Testing Docker build with Railway environment variables..."
echo "=================================================="

# Build the Docker image
echo ""
echo "📦 Building Docker image..."
docker build -t integrityhvac-test .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo ""
echo "✅ Docker build successful!"
echo ""
echo "🚀 Running container with Railway-like environment variables..."
echo ""

# Run with environment variables like Railway would set them
docker run --rm \
    -e NODE_ENV=staging \
    -e SUPABASE_URL=https://mladgojbfyofgauiylxw.supabase.co \
    -e SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYWRnb2piZnlvZmdhdWl5bHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI5MzI5NCwiZXhwIjoyMDgzODY5Mjk0fQ.VOfQtKJua7dCM_Lg0Na-ya89HH8JvjhqUk9mX7lgNeE \
    -e JWT_SECRET=c4472b46c0974013fb3512737292dd85f66d6aa26f383827e20fb06df591c8f4 \
    -e PORT=5000 \
    -p 5000:5000 \
    integrityhvac-test

echo ""
echo "📋 Look for these lines in the output above:"
echo "  ✅ 'Running in cloud environment'"
echo "  ✅ 'SUPABASE_URL: ✅ Set'"
echo "  ✅ 'Connected to: https://mladgojbfyofgauiylxw.supabase.co'"
echo ""
echo "If you see 'localhost' anywhere, the environment variables aren't being passed correctly."
