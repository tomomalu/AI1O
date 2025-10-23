#!/bin/bash

echo "🚀 Starting AI1O Agent Web App..."
echo "📁 Current directory: $(pwd)"
echo "📁 App directory: $(pwd)/app"
echo "📁 Agents directory: $(pwd)/agents"

cd app
echo "✅ Changed to app directory: $(pwd)"
echo "📄 Files in app directory:"
ls -la

echo ""
echo "🔍 Checking agents directory from app:"
ls -la ../agents/

echo ""
echo "🚀 Starting Flask application..."
python3 app.py