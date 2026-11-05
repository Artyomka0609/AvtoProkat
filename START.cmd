@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/start.mjs
if errorlevel 1 pause
