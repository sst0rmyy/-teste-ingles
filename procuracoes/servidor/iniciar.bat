@echo off
title Livro de Procuracoes - servidor
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Baixe em https://nodejs.org ^(versao LTS^) e rode este arquivo de novo.
  pause
  exit /b 1
)
node servidor.js
pause
