param(
  [string]$CacheRoot = 'C:\.next-cache',
  [string]$ProjectName = 'emergent-crm-adm'
)

$ErrorActionPreference = 'Stop'

# Caminhos
$ProjectDir = (Get-Location).Path
$NextDir = Join-Path $ProjectDir '.next'
$TargetDir = Join-Path $CacheRoot $ProjectName

Write-Host "Projeto: $ProjectDir" -ForegroundColor Cyan
Write-Host "Destino do cache: $TargetDir" -ForegroundColor Cyan

# Cria pasta de destino
if (!(Test-Path $TargetDir)) {
  New-Item -Path $TargetDir -ItemType Directory | Out-Null
}

# Remove .next existente
if (Test-Path $NextDir) {
  try {
    Remove-Item -LiteralPath $NextDir -Recurse -Force -ErrorAction Stop
  } catch {
    # fallback via cmd em caso de erro
    cmd /c rmdir /s /q "$NextDir" 2>$null
  }
}

# Cria junction .next -> $TargetDir
cmd /c mklink /J "$NextDir" "$TargetDir" | Out-Null

Write-Host 'Junction criada com sucesso.' -ForegroundColor Green
Write-Host 'Agora execute: yarn dev' -ForegroundColor Green
