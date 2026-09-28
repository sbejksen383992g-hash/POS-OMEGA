@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [APEX] FINAL OnePlus mobile build + install

REM Install dependencies only when Vite is not present.
if not exist "node_modules\vite\bin\vite.js" (
  echo [APEX] Installing npm dependencies...
  call npm install --no-audit --no-fund || goto :error
)

call npm run build || goto :error
call node scripts/ensure-android.mjs || goto :error

REM Auto-create local.properties when Android Studio uses the standard Windows SDK path.
if not exist "android\local.properties" (
  if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    >"android\local.properties" echo sdk.dir=%LOCALAPPDATA:\=/%/Android/Sdk
    echo [APEX] Created android\local.properties automatically.
  )
)

cd android
call gradlew.bat clean || goto :error
call gradlew.bat assembleDebug || goto :error
cd ..

if not exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" goto :noadb
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" devices
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\debug\app-debug.apk" || goto :error

 echo.
echo [APEX] SUCCESS - APK installed on the connected phone.
exit /b 0

:noadb
echo.
echo [APEX] APK built successfully, but adb.exe was not found at the standard SDK path.
echo APK: %cd%\android\app\build\outputs\apk\debug\app-debug.apk
exit /b 0

:error
cd /d "%~dp0"
echo.
echo [APEX] BUILD FAILED. Read the error above.
exit /b 1
