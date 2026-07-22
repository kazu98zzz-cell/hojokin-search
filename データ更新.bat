@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ==================================================
echo   Update hojokin (subsidy) data from jGrants
echo   -^> public\data\subsidies.json
echo ==================================================
echo.

where node > nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  echo.
  pause
  exit /b 1
)

node fetch-data.js
set EXITCODE=%errorlevel%
echo.

if "%EXITCODE%"=="0" (
  echo ==================================================
  echo   DONE. Data updated successfully.
  echo   Next: drag the "public" folder to Netlify.
  echo ==================================================
) else (
  echo ==================================================
  echo   [ERROR] Update failed. Exit code: %EXITCODE%
  echo   Please copy the messages above and report them.
  echo ==================================================
)

echo.
pause
