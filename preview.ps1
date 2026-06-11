$siteRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = "C:\Users\Re dmi\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$port = 4350

Set-Location $siteRoot

if (Test-Path $python) {
    Start-Process "http://localhost:$port"
    & $python -m http.server $port
} else {
    Start-Process (Join-Path $siteRoot "index.html")
}
