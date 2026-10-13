@echo off
title DataMorph Launcher
echo ========================================================
echo        DATAMORPH: AI Adaptive Dashboard Framework       
echo ========================================================
echo Checking prerequisites...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found on PATH. Please install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found on PATH. Please install Node.js 20+ and add it to PATH.
    pause
    exit /b 1
)

echo Prerequisites verified: Python and Node.js detected.
echo Starting all 3 local service components...
echo.

:: 1. Start Python AI Engine (Port 5005)
echo [1/3] Starting Python AI Engine on http://127.0.0.1:5005 ...
start "DataMorph AI Engine (Port 5005)" cmd /k "cd /d "%~dp0ai-engine" && python server.py"

:: 2. Start Next.js Backend API (Port 3001)
echo [2/3] Starting Next.js API on http://localhost:3001 ...
start "DataMorph Backend API (Port 3001)" cmd /k "cd /d "%~dp0backend\nextjs-api" && npm run dev"

:: 3. Start Angular Frontend UI (Port 4200)
echo [3/3] Starting Angular Desktop Frontend on http://localhost:4200 ...
start "DataMorph Angular UI (Port 4200)" cmd /k "cd /d "%~dp0frontend\angular-app" && npm start"

echo.
echo ========================================================
echo All services launched in separate windows!
echo Once Angular finishes compiling, open your browser at:
echo    http://localhost:4200
echo ========================================================
pause
