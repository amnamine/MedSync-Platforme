@echo off
title MedSync Platform Launcher
echo ===================================================
echo       Starting MedSync Platform
echo ===================================================

echo.
echo [1/2] Launching Backend Server...
:: Opens a new terminal, navigates to the backend folder, and starts the server
start "MedSync Backend" cmd /k "cd backend && node src/server.js"

echo [2/2] Launching Frontend Server...
:: Opens a new terminal, navigates to the frontend folder, and starts Vite
start "MedSync Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
exit