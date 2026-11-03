@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Developer setup required. See LOCAL_DEPLOYMENT.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -B launcher.py
if errorlevel 1 pause
