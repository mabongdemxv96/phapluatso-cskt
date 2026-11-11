@echo off
chcp 65001 > nul
title Tủ sách Pháp luật số & Trợ lý AI - Đoàn CSKT Công an tỉnh Gia Lai
echo =========================================================================
echo   CÔNG TRÌNH THANH NIÊN: KHÔNG GIAN PHÁP LUẬT SỐ & TRỢ LÝ AI
echo   Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
echo   Tiên phong thực hiện Nghị quyết số 57-NQ/TW
echo =========================================================================
echo.
echo Đang khởi chạy máy chủ web cục bộ tại cổng 8000...
echo Mở trình duyệt tại: http://localhost:8000
echo.

start http://localhost:8000

REM Chạy Python HTTP Server
python -m http.server 8000 2>nul || "%LOCALAPPDATA%\Python\bin\python.exe" -m http.server 8000 2>nul || py -m http.server 8000 2>nul || (
    echo Không tìm thấy Python trong PATH, đang mở trực tiếp file index.html trong trình duyệt...
    start index.html
)

pause
