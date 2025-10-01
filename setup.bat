@echo off
title CrisisLink Setup

echo.
echo 🚨 CrisisLink Setup Starting...
echo ================================

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm ^(comes with Node.js^)
    pause
    exit /b 1
)

REM Check for PostgreSQL
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL not found. Please install PostgreSQL from https://www.postgresql.org/
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!

REM Check for API key
findstr /C:"OPENWEATHER_API_KEY=your_" backend\.env >nul
if %errorlevel% equ 0 (
    echo.
    echo ⚠️  IMPORTANT: You need an OpenWeatherMap API key!
    echo    1. Go to: https://openweathermap.org/api
    echo    2. Sign up for free
    echo    3. Get your API key
    echo    4. Replace 'your_openweather_api_key_needed_here' in backend\.env
    echo.
    set /p answer="Have you added your OpenWeatherMap API key? (y/n): "
    if /i not "%answer%"=="y" (
        echo Please add your API key first, then run this script again.
        pause
        exit /b 1
    )
)

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Backend installation failed
    pause
    exit /b 1
)

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend installation failed
    pause
    exit /b 1
)
cd ..

REM Database setup
echo.
echo 🗄️  Setting up database...
set /p db_user="Enter PostgreSQL username (default: postgres): "
if "%db_user%"=="" set db_user=postgres

set /p db_password="Enter PostgreSQL password: "

echo Creating database 'crisislink_db'...
set PGPASSWORD=%db_password%
createdb -U %db_user% crisislink_db 2>nul || echo Database may already exist

echo Setting up database schema...
psql -U %db_user% -d crisislink_db -f database\schema.sql

echo.
echo 🎉 Setup complete!
echo.
echo 🚀 To start the system:
echo    npm run dev
echo.
echo 📱 Access the app at:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:5000
echo.
echo 🔑 Still need API keys? Check docs\API_KEYS_SETUP.md
echo.
echo 🆘 Ready to test emergency response system!
echo.
pause