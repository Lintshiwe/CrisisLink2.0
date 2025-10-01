#!/bin/bash

# 🚨 CrisisLink Setup Script
# This script sets up your CrisisLink disaster rescue system

echo "🚨 CrisisLink Setup Starting..."
echo "================================"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm (comes with Node.js)"
    exit 1
fi

if ! command_exists psql; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL from https://www.postgresql.org/"
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Check for OpenWeatherMap API key
if ! grep -q "^OPENWEATHER_API_KEY=[^your_]" backend/.env; then
    echo ""
    echo "⚠️  IMPORTANT: You need an OpenWeatherMap API key!"
    echo "   1. Go to: https://openweathermap.org/api"
    echo "   2. Sign up for free"
    echo "   3. Get your API key"
    echo "   4. Replace 'your_openweather_api_key_needed_here' in backend/.env"
    echo ""
    read -p "Have you added your OpenWeatherMap API key? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please add your API key first, then run this script again."
        exit 1
    fi
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
cd ..

# Setup database
echo ""
echo "🗄️  Setting up database..."
read -p "Enter PostgreSQL username (default: postgres): " db_user
db_user=${db_user:-postgres}

read -s -p "Enter PostgreSQL password: " db_password
echo

# Create database
echo "Creating database 'crisislink_db'..."
PGPASSWORD=$db_password createdb -U $db_user crisislink_db 2>/dev/null || echo "Database may already exist"

# Run schema
echo "Setting up database schema..."
PGPASSWORD=$db_password psql -U $db_user -d crisislink_db -f database/schema.sql

# Update database connection in .env
sed -i "s/your_db_user_here/$db_user/g" backend/.env
sed -i "s/your_db_password_here/$db_password/g" backend/.env

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the system:"
echo "   npm run dev"
echo ""
echo "📱 Access the app at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo ""
echo "🔑 Still need API keys? Check docs/API_KEYS_SETUP.md"
echo ""
echo "🆘 Ready to test emergency response system!"