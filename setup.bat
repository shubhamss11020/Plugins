@echo off
title EOXS Plugin Setup for Claude Desktop
echo ===================================================
echo     EOXS Claude Desktop Plugin - 1-Click Setup
echo ===================================================
echo.

:: Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your computer!
    echo Please download and install Node.js from: https://nodejs.org/
    echo Once installed, run this setup.bat again.
    echo.
    pause
    exit /b 1
)

:: Run the interactive installer
node "%~dp0scripts\install.js"

pause
