@echo off

REM 1) Go to the directory
cd /D "D:\Documents\programming projects\AI image porjects\ai-image-generator\"

REM 2) Activate the conda environment
call conda activate ai-image-env

REM 3) Start Python app in a separate window
start python app.py

REM 4) Wait 5 seconds for server to launch
timeout /t 5 >nul

REM 5) Open in Chrome “app” mode at 1300x800
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --app=http://127.0.0.1:13300 ^
  --window-size=1300,700 ^
  --window-position=300,150