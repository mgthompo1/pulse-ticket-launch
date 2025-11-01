#!/bin/bash

echo "🔍 Checking SSR Build Configuration..."
echo ""

echo "1. Checking required files..."
echo "   ✓ server.js: $([ -f server.js ] && echo 'EXISTS' || echo '❌ MISSING')"
echo "   ✓ entry-server.tsx: $([ -f src/entry-server.tsx ] && echo 'EXISTS' || echo '❌ MISSING')"
echo "   ✓ Dockerfile: $([ -f Dockerfile ] && echo 'EXISTS' || echo '❌ MISSING')"
echo "   ✓ railway.json: $([ -f railway.json ] && echo 'EXISTS' || echo '❌ MISSING')"
echo ""

echo "2. Checking build directories..."
echo "   ✓ dist/client: $([ -d dist/client ] && echo 'EXISTS' || echo '❌ MISSING')"
echo "   ✓ dist/server: $([ -d dist/server ] && echo 'EXISTS' || echo '❌ MISSING')"
echo ""

echo "3. Environment variables needed in Railway:"
echo "   ⚠️  SUPABASE_URL (currently: ${SUPABASE_URL:-'NOT SET'})"
echo "   ⚠️  SUPABASE_ANON_KEY (currently: ${SUPABASE_ANON_KEY:-'NOT SET'})"
echo "   ⚠️  PORT (optional, defaults to 3000)"
echo "   ⚠️  NODE_ENV (should be 'production')"
echo ""

echo "4. Testing SSR build..."
if npm run build:ssr 2>&1 | grep -q "error"; then
  echo "   ❌ Build failed - check logs above"
else
  echo "   ✓ Build completed"
fi
echo ""

echo "📝 Next steps to fix Railway deployment:"
echo "   1. Go to Railway dashboard → your project → Variables"
echo "   2. Add/verify these environment variables:"
echo "      - SUPABASE_URL=your_supabase_url"
echo "      - SUPABASE_ANON_KEY=your_supabase_anon_key"
echo "      - NODE_ENV=production"
echo "   3. Trigger a redeploy"
echo ""
