@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install from https://nodejs.org/ & pause & exit /b)
echo Starting AdamPrint agent...
start "" /B node agent.js
timeout /t 1 /nobreak >nul
start http://localhost:7777/
endlocal
