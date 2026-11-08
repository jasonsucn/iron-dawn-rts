param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$url = 'http://127.0.0.1:4173/'
$healthUrl = 'http://127.0.0.1:4173/__health'

function Test-IronDawnServer {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
        if ($response.StatusCode -ne 200) { return $false }
        $payload = $response.Content | ConvertFrom-Json
        return ($payload.app -eq 'iron-dawn')
    } catch {
        return $false
    }
}

function Open-Game {
    if ($NoBrowser) {
        Write-Host "浏览器未自动打开。请访问：$url" -ForegroundColor Yellow
        return
    }
    try {
        Start-Process -FilePath $url
        Write-Host "已在默认浏览器中打开：$url" -ForegroundColor Green
    } catch {
        Write-Host "无法自动打开浏览器，请手动访问：$url" -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host '        IRON DAWN / 钢铁黎明' -ForegroundColor Cyan
Write-Host '        快速启动 · 本地遭遇战' -ForegroundColor DarkGray
Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host ''

Set-Location $root

if (Test-IronDawnServer) {
    Write-Host '游戏服务已经在运行。' -ForegroundColor Green
    Open-Game
    exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host '未找到 Node.js。' -ForegroundColor Red
    Write-Host '请先安装 Node.js（建议 20 或更高版本），然后重新运行本脚本。' -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path (Join-Path $root 'server.mjs'))) {
    Write-Host '没有找到 server.mjs，请确认本脚本放在游戏根目录。' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $root 'node_modules\three\build\three.module.js'))) {
    Write-Host '缺少本地 Three.js 依赖（node_modules\three）。' -ForegroundColor Red
    Write-Host '请在本目录运行：npm install --ignore-scripts' -ForegroundColor Yellow
    exit 1
}

try {
    $occupied = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction Stop
    if ($occupied) {
        $owners = ($occupied | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
        Write-Host '端口 4173 已被其他程序占用。' -ForegroundColor Red
        Write-Host "占用进程 PID：$owners" -ForegroundColor Yellow
        Write-Host '请先关闭占用该端口的程序，然后重新运行。' -ForegroundColor Yellow
        exit 1
    }
} catch {
    # Get-NetTCPConnection 在少数受限环境中不可用；继续尝试启动即可。
}

Write-Host '正在启动本地静态服务器…' -ForegroundColor Cyan
try {
    $serverProcess = Start-Process `
        -FilePath $node.Source `
        -ArgumentList 'server.mjs' `
        -WorkingDirectory $root `
        -WindowStyle Normal `
        -PassThru
} catch {
    Write-Host "启动 Node 服务失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$started = $false
for ($i = 0; $i -lt 40; $i++) {
    if (Test-IronDawnServer) {
        $started = $true
        break
    }
    if ($serverProcess.HasExited) {
        break
    }
    Start-Sleep -Milliseconds 300
}

if (-not $started) {
    Write-Host '服务器没有成功启动。' -ForegroundColor Red
    Write-Host '请查看新打开的 Node 窗口中的错误信息，或运行 node server.mjs 排查。' -ForegroundColor Yellow
    exit 1
}

Write-Host '游戏服务已启动。' -ForegroundColor Green
Write-Host '关闭新打开的 Node 服务器窗口即可停止服务。' -ForegroundColor DarkGray
Open-Game
exit 0
