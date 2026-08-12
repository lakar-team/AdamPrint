@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required. Install from https://nodejs.org/ & pause & exit /b)
echo Starting AdamPrint agent...
start "" /B node agent.js
timeout /t 1 /nobreak >nul
for /f "delims=" %%u in ('node -e "try{const c=require('./agent-config.json');console.log('http://localhost:7777/app.html?token='+c.token)}catch(e){console.log('http://localhost:7777/app.html')}"') do set "APPURL=%%u"
start "" "%APPURL%"
endlocal
