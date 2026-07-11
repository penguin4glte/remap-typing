@echo off
rem Remap Keymap Typing をローカルサーバーで起動します
cd /d "%~dp0"
start "" http://localhost:8137
python -m http.server 8137
