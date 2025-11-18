#!/bin/bash

echo "🚀 Job Importer System - Setup Script"
echo "======================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm -v)"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd server
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../client
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Check for MongoDB
echo ""
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB found"
else
    echo "⚠️  MongoDB not found. Please install MongoDB or use Docker."
fi

# Check for Redis
if command -v redis-server &> /dev/null; then
    echo "✅ Redis found"
else
    echo "⚠️  Redis not found. Please install Redis or use Docker."
fi

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "Option 1 - Using Docker (Recommended):"
echo "  docker-compose up"
echo ""
echo "Option 2 - Manual start:"
echo "  1. Start MongoDB: mongod"
echo "  2. Start Redis: redis-server"
echo "  3. Start Backend: cd server && npm run dev"
echo "  4. Start Frontend: cd client && npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo "======================================"
