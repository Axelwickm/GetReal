@echo off

echo Pulling latest version from GitHub
git pull

echo Installing dependencies for frontend serverx
npm install

echo Installing dependencies for backend server
cd server
npm install
cd ..

exit
