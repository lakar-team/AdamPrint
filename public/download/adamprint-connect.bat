@echo off
setlocal enabledelayedexpansion
title AdamPrint - Connect your PC
color 0b

echo ================================================================
echo   AdamPrint  -  Connect your PC
echo ================================================================
echo.
echo This sets up the small "agent" that lets the AdamPrint website
echo drive this computer. It checks for what it needs and installs it.
echo.

set "DIR=%LOCALAPPDATA%\AdamPrint\agent"
set "RAW=https://raw.githubusercontent.com/lakar-team/AdamPrint/main/agent"
set "CF=https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
if not exist "%DIR%" mkdir "%DIR%" >nul 2>nul
cd /d "%DIR%"
echo Install folder: %DIR%
echo.

echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo       Not found. Installing Node.js LTS via winget - please approve the prompt...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo       [!] winget is unavailable. Install Node.js from https://nodejs.org/ then re-run this.
    pause & exit /b 1
  )
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  set "PATH=%PATH%;%ProgramFiles%\nodejs\"
) else (
  echo       OK
)

echo [2/4] Downloading the AdamPrint agent...
for %%f in (agent.js go.js pair.js supa.js supabase.js) do (
  powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing '%RAW%/%%f' -OutFile '%DIR%\%%f'}catch{exit 1}" >nul 2>nul
  if errorlevel 1 ( echo       [!] Failed to download %%f & pause & exit /b 1 )
  echo       got %%f
)

echo [3/4] Checking Cloudflare tunnel...
if not exist "%DIR%\cloudflared.exe" (
  echo       Downloading cloudflared ^(~50 MB^)...
  powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing '%CF%' -OutFile '%DIR%\cloudflared.exe'}catch{exit 1}" >nul 2>nul
  if errorlevel 1 ( echo       [!] Failed to download cloudflared & pause & exit /b 1 )
  echo       OK
) else ( echo       OK )

echo [4/4] Pairing + starting...
echo.
findstr /c:"refresh_token" "%DIR%\agent-config.json" >nul 2>nul
if errorlevel 1 (
  echo   This PC isn't paired to your account yet - let's do that once.
  node "%DIR%\pair.js"
)
echo.
echo ================================================================
echo   Starting the bridge. KEEP THIS WINDOW OPEN while you use the
echo   website - closing it disconnects this PC.
echo ================================================================
echo.
node "%DIR%\go.js"

echo.
echo Bridge stopped. Press any key to close.
pause >nul
endlocal
