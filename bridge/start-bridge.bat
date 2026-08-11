@echo off
title Plant Log Analyzer - Excel Bridge
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0excel-bridge.ps1"
echo.
echo Bridge หยุดทำงานแล้ว - กด key ใดก็ได้เพื่อปิดหน้าต่างนี้
pause >nul
