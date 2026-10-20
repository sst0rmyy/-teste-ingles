@echo off
title Livro de Procuracoes - trocar senha
cd /d "%~dp0"
node servidor.js --definir-senha
echo.
echo Feche a janela do servidor e abra o iniciar.bat de novo.
pause
