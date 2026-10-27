@echo off
setlocal
cd /d "%~dp0"
if not exist ".runtime\portal-runtime-ready" (
  echo First start: downloading official Python runtime. Internet access is required once.
  echo No administrator access or installed developer tools are needed.
  powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $zip=Join-Path (Get-Location) 'python-runtime.download.zip'; Invoke-WebRequest -UseBasicParsing -Uri 'https://www.python.org/ftp/python/3.13.17/python-3.13.17-embed-amd64.zip' -OutFile $zip; if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash.ToLower() -ne '9e35319bffedab8b36ad44d8f377cb4f1733bcec257a0b6d04d94f01486ddb38') { throw 'Python checksum mismatch. Download was not installed.' }; Expand-Archive -LiteralPath $zip -DestinationPath '.runtime' -Force; @('python313.zip','.','Lib/site-packages','..','import site') | Set-Content -Encoding ASCII -LiteralPath '.runtime\python313._pth'; Remove-Item -LiteralPath $zip; '3.13.17 verified' | Set-Content -Encoding ASCII -LiteralPath '.runtime\portal-runtime-ready'"
  if errorlevel 1 (
    echo Download failed. Check your network or ask IT. Retry Start-Portal.cmd after resolving it.
    pause
    exit /b 1
  )
)
".runtime\python.exe" -B launcher.py
if errorlevel 1 (
  echo.
  echo Startup failed. See the message above and LOCAL_DEPLOYMENT.md.
  pause
  exit /b 1
)
