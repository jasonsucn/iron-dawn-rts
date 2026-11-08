@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title IRON DAWN Quick Start
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-game.ps1" %*
if errorlevel 1 (
  echo.
  pause
)
endlocal
