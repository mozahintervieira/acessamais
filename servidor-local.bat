@echo off
setlocal
cd /d "%~dp0"
echo Acessa+ rodando em http://localhost:8787
echo Para encerrar, feche esta janela.
"C:\Users\mozah\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8787
