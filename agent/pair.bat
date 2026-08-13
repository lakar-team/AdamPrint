@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install from https://nodejs.org/ & pause & exit /b)
node pair.js
echo.
pause
endlocal
