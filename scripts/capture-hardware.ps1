param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\benchmarks\results\hardware.json')
)

$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, NumberOfCores, NumberOfLogicalProcessors
$computer = Get-CimInstance Win32_ComputerSystem
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [PSCustomObject]@{ name = $_.Name; memory_bytes = $_.AdapterRAM; driver_version = $_.DriverVersion }
})
$payload = [ordered]@{
  captured_at = (Get-Date).ToUniversalTime().ToString('o')
  operating_system = (Get-CimInstance Win32_OperatingSystem | Select-Object -First 1 Caption, Version, OSArchitecture)
  computer = [ordered]@{ manufacturer = $computer.Manufacturer; model = $computer.Model; memory_bytes = $computer.TotalPhysicalMemory }
  cpu = [ordered]@{ name = $cpu.Name; cores = $cpu.NumberOfCores; logical_processors = $cpu.NumberOfLogicalProcessors }
  graphics = $gpus
  node = (& node --version)
  python = (& "$PSScriptRoot\..\backend\.venv\Scripts\python.exe" --version)
  qvac_health = try { Invoke-RestMethod 'http://127.0.0.1:11500/health' -TimeoutSec 5 } catch { [ordered]@{ status = 'unavailable'; error = $_.Exception.Message } }
}
$directory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $directory | Out-Null
$payload | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 -Path $OutputPath
Write-Output "Hardware evidence written to $OutputPath"
