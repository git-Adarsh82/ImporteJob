@echo off
echo ====================================
echo Job Importer System - Setup Script
echo ====================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo OK: Node.js found: %NODE_VERSION%

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo OK: npm found: %NPM_VERSION%

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo OK: Backend dependencies installed

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd ../client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
echo OK: Frontend dependencies installed

REM Check for MongoDB
echo.
where mongod >nul 2>nul
if %errorlevel% equ 0 (
    echo OK: MongoDB found
) else (
    echo WARNING: MongoDB not found. Please install MongoDB or use Docker.
)

REM Check for Redis
where redis-server >nul 2>nul
if %errorlevel% equ 0 (
    echo OK: Redis found
) else (
    echo WARNING: Redis not found. Please install Redis or use Docker.
)

echo.
echo ====================================
echo Setup complete!
echo.
echo To start the application:
echo.
echo Option 1 - Using Docker (Recommended):
echo   docker-compose up
echo.
echo Option 2 - Manual start:
echo   1. Start MongoDB: mongod
echo   2. Start Redis: redis-server
echo   3. Start Backend: cd server and npm run dev
echo   4. Start Frontend: cd client and npm run dev
echo.
echo Then visit: http://localhost:3000
echo ====================================
echo.
pause
