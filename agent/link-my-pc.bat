@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install from https://nodejs.org/ & pause & exit /b)
title AdamPrint - your PC bridge (keep open)
node go.js
echo.
echo Bridge stopped. Press any key to close.
pause >nul
endlocal
