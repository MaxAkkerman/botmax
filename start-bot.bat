@echo off
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%AppData%\npm;%PATH%"
set "NODE_EXTRA_CA_CERTS=%~dp0certs\russian-trusted.pem"
wscript.exe "%~dp0start-bot-hidden.vbs"
