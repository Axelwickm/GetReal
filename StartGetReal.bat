@echo off

start "Frontend" cmd /k "npm run start"

cd server
start "Backend" cmd /k "npm start"

exit

