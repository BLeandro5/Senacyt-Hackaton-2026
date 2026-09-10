$projectRoot = Split-Path -Parent $PSScriptRoot
Get-Command node -ErrorAction SilentlyContinue | Select-Object Name, Source
Get-Command python -ErrorAction SilentlyContinue | Select-Object Name, Source
@('backend/.venv/Scripts/python.exe','models/medpsy-1.7b-q4_k_m-imat.gguf','qvac/server.mjs','backend/data/inventory.sqlite3') | ForEach-Object {
    [PSCustomObject]@{ Path = $_; Exists = Test-Path (Join-Path $projectRoot $_) }
}
Write-Output 'Local service ports: QVAC 11500, FastAPI 8000, Vite 5173. SQLite initializes on the first database request.'
