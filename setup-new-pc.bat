@echo off
chcp 65001 >nul
title Plant Log Analyzer — One-Click Setup New PC
echo ==========================================================
echo  Plant Log Analyzer: กำลังตั้งค่าระบบสำหรับ PC เครื่องใหม่...
echo ==========================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-new-pc.ps1"
echo.
echo ==========================================================
echo  กดปุ่มใดก็ได้เพื่อปิดหน้าต่างนี้...
echo ==========================================================
pause >nul
