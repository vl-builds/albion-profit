$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# Check external connectivity in the same environment inherited by the server.
# Do not start an apparently healthy scanner that cannot retrieve market data.
python -c "import httpx; r = httpx.get('https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG', timeout=20); r.raise_for_status()"
if ($LASTEXITCODE -ne 0) {
    throw 'Sem acesso ao serviço de preços. Verifique a internet e o proxy. Se estiver iniciando pelo Codex, execute com acesso de rede autorizado.'
}

$flipListener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($flipListener) {
    Write-Host 'A porta 8000 já está em uso. Se a ferramenta estiver com falha de conexão, encerre a instância anterior antes de iniciar novamente.'
    exit 1
}

New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'data') -Force | Out-Null

$flipPython = (Get-Command python).Source
$flipProcess = Start-Process -FilePath $flipPython -ArgumentList '-m','uvicorn','main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/server-output.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/server-error.log') -PassThru
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if ($flipProcess.HasExited) { throw 'A ferramenta encerrou durante a inicialização. Consulte data/server-error.log.' }
    try {
        $flipReady = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/catalog' -UseBasicParsing -TimeoutSec 2
        if ($flipReady.StatusCode -eq 200) {
            Write-Host 'Ferramenta pronta: http://127.0.0.1:8000'
            exit 0
        }
    } catch { Start-Sleep -Milliseconds 500 }
}
throw 'A ferramenta ainda não respondeu. Consulte data/server-error.log.'
