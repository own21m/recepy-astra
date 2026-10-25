param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8081,
    [switch]$Web
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$expoCli = Join-Path $projectRoot 'node_modules/expo/bin/cli'
if (-not (Test-Path -LiteralPath $expoCli)) {
    Write-Error 'Faltan las dependencias. Abre esta carpeta y ejecuta: pnpm install'
    exit 1
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $bundledNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (-not (Test-Path -LiteralPath $bundledNode)) {
        Write-Error 'No se encuentra Node.js. Instala Node.js y vuelve a ejecutar este archivo.'
        exit 1
    }
    $nodePath = $bundledNode
}

Set-Location -LiteralPath $projectRoot
$expoArguments = @($expoCli, 'start', '--go', '--lan', '--port', "$Port")
if ($Web) { $expoArguments += '--web' }
Write-Host 'RECEPY local. Conecta el iPhone a la misma red Wi-Fi y escanea el QR de Expo.'
& $nodePath @expoArguments
exit $LASTEXITCODE
