@echo off
cd /d "%~dp0"
echo Adding files...
git add .
echo Committing...
git commit -m "bump version to v1.1.002"
echo Pushing to feature/v1.1.002...
git push origin HEAD:feature/v1.1.002
echo Done!
pause