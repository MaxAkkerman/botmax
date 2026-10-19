@echo off
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%AppData%\npm;%PATH%"
set "NODE_EXTRA_CA_CERTS=%~dp0certs\russian-trusted.pem"
if not exist "%~dp0data" mkdir "%~dp0data"

:loop
echo [%date% %time%] Starting MAX bot...>> "%~dp0data\bot.log"
call npm run start:local >> "%~dp0data\bot.log" 2>&1
echo [%date% %time%] Bot stopped, restart in 10 sec...>> "%~dp0data\bot.log"
timeout /t 10 /nobreak >nul
goto loop
