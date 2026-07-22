@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================
echo   Push this project to GitHub
echo   (Run this once, after creating an empty repo)
echo ==================================================
echo.
set /p REPOURL="Paste your GitHub repo URL (....git) and press Enter: "
if "%REPOURL%"=="" (
  echo [ERROR] URL is empty. Aborted.
  echo.
  pause
  exit /b 1
)

git remote remove origin > nul 2>&1
git remote add origin "%REPOURL%"
git branch -M main

echo.
echo Pushing to GitHub...
echo (A browser sign-in window may pop up the first time - please sign in.)
echo.
git push -u origin main
set EXITCODE=%errorlevel%
echo.

if "%EXITCODE%"=="0" (
  echo ==================================================
  echo   DONE. Your code is now on GitHub.
  echo   Next: connect this repo to Netlify.
  echo ==================================================
) else (
  echo ==================================================
  echo   [ERROR] Push failed ^(code %EXITCODE%^).
  echo   Please copy the messages above and report them.
  echo ==================================================
)
echo.
pause
