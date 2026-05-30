@echo off
title BOMMaster 启动器
cd /d "%~dp0"

echo ================================
echo   BOMMaster 启动中...
echo   项目目录: %~dp0
echo ================================
echo.

REM 检查 node 是否可用
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org
    pause
    exit /b
)

REM 释放 1420 端口 (如果有占用)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":1420.*LISTENING"') do (
    echo [端口释放] 1420 端口被占用，正在释放...
    taskkill /PID %%a /F >nul 2>&1
)

REM 安装依赖 (如果 node_modules 不存在)
if not exist "node_modules\" (
    echo [安装] 检测到首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败
        pause
        exit /b
    )
    echo.
)

echo [启动] 开发服务器启动中...
echo 访问地址: http://localhost:1420
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

npm run dev
pause