#Requires -Version 5.1

param(
  [string]$OutDir = "./backups",
  [string]$Schema = "public",
  [ValidateSet('c','p')]
  [string]$Format = 'c' # c=custom (recomendado), p=plain SQL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  # Em PowerShell 5.1+, $PSScriptRoot existe no escopo de script.
  $scriptRoot = $PSScriptRoot
  if (-not $scriptRoot) {
    # Fallback: PSCommandPath em versões compatíveis
    if ($PSCommandPath) { $scriptRoot = Split-Path -Parent $PSCommandPath }
    else { $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition }
  }
  # scripts/windows -> repo root
  return (Resolve-Path (Join-Path $scriptRoot "..\..")).Path
}

function Read-FileIfExists([string]$path) {
  if (Test-Path $path) {
    return (Get-Content -Raw -LiteralPath $path).Trim()
  }
  return $null
}

function Get-ProjectRef([string]$repoRoot) {
  $ref = Read-FileIfExists (Join-Path $repoRoot 'supabase/.temp/project-ref')
  if ($ref) { return $ref }

  # Tenta deduzir a partir do NEXT_PUBLIC_SUPABASE_URL
  $url = $env:NEXT_PUBLIC_SUPABASE_URL
  if ($url) {
    try {
      $u = [Uri]$url
      $host = $u.Host # ex: uhugwjitrupiwefjnvsf.supabase.co
      if ($host -match '^(?<ref>[^\.]+)\.') { return $Matches['ref'] }
    } catch {}
  }
  throw "Não foi possível determinar o project ref do Supabase. Crie 'supabase/.temp/project-ref' ou defina NEXT_PUBLIC_SUPABASE_URL."
}

function Parse-Pooler([string]$repoRoot, [string]$projectRef) {
  $poolerUrl = Read-FileIfExists (Join-Path $repoRoot 'supabase/.temp/pooler-url')
  if (-not $poolerUrl) { throw "Arquivo 'supabase/.temp/pooler-url' não encontrado. Abra o painel do Supabase > Settings > Database e copie a Pooler connection string para esse arquivo ou defina manualmente host/port." }

  try {
    $uri = [Uri]$poolerUrl
  } catch {
    throw "pooler-url inválida. Conteúdo atual: $poolerUrl"
  }

  $pgHost = $uri.Host
  $port = if ($uri.Port -gt 0) { $uri.Port } else { 6543 }
  $db   = ($uri.AbsolutePath.Trim('/')); if (-not $db) { $db = 'postgres' }
  $user = "postgres.$projectRef"
  return [pscustomobject]@{ Host = $pgHost; Port = $port; Db = $db; User = $user }
}

function Ensure-OutDir([string]$path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
  return (Resolve-Path $path).Path
}

function Get-Password() {
  if ($env:SUPABASE_DB_PASSWORD) { return $env:SUPABASE_DB_PASSWORD }
  Write-Host "Digite a senha do banco (não ficará salvo):" -ForegroundColor Yellow
  $sec = Read-Host -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Has-Command([string]$name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

# Main
$repoRoot = Resolve-RepoRoot
$projectRef = Get-ProjectRef -repoRoot $repoRoot
$pooler = Parse-Pooler -repoRoot $repoRoot -projectRef $projectRef
$outPath = Ensure-OutDir -path (Join-Path $repoRoot $OutDir)

$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
$ext = if ($Format -eq 'c') { 'dump' } else { 'sql' }
$fileName = "belz-crm_${ts}.$ext"
$filePath = Join-Path $outPath $fileName

$pwdPlain = Get-Password
if (-not $pwdPlain) { throw "Senha não fornecida. Defina SUPABASE_DB_PASSWORD ou informe no prompt." }

Write-Host "Projeto: $projectRef" -ForegroundColor Cyan
Write-Host "Host: $($pooler.Host):$($pooler.Port)  DB: $($pooler.Db)  User: $($pooler.User)  Schema: $Schema" -ForegroundColor Cyan
Write-Host "Saída: $filePath  Formato: $Format" -ForegroundColor Cyan

$env:PGPASSWORD = $pwdPlain
try {
  $success = $false

  if (Has-Command 'pg_dump') {
    Write-Host "Usando pg_dump local..." -ForegroundColor Green
    $args = @(
      '-h', $pooler.Host,
      '-p', $pooler.Port,
      '-U', $pooler.User,
      '-d', $pooler.Db,
      '-n', $Schema,
      '--no-owner', '--no-privileges'
    )
    if ($Format -eq 'c') { $args += @('-F','c') } else { $args += @('-F','p') }
    $args += @('-f', $filePath)

    & pg_dump @args
    if ($LASTEXITCODE -ne 0) { throw "pg_dump retornou código $LASTEXITCODE" }
    $success = $true
  }
  elseif (Has-Command 'docker') {
    Write-Host "pg_dump não encontrado. Tentando via Docker (postgres:16-alpine)..." -ForegroundColor Yellow
    $dockerArgs = @(
      'run','--rm','-e',"PGPASSWORD=$pwdPlain",
      '-v',"$($outPath):/out",
      'postgres:16-alpine','pg_dump',
      '-h', $pooler.Host,
      '-p', $pooler.Port,
      '-U', $pooler.User,
      '-d', $pooler.Db,
      '-n', $Schema,
      '--no-owner','--no-privileges'
    )
    if ($Format -eq 'c') { $dockerArgs += @('-F','c') } else { $dockerArgs += @('-F','p') }
    $dockerArgs += @('-f', "/out/$fileName")

    & docker @dockerArgs
    if ($LASTEXITCODE -ne 0) { throw "docker/pg_dump retornou código $LASTEXITCODE. Verifique se o Docker Desktop está em execução." }
    $success = $true
  }
  else {
    throw "Nenhuma ferramenta encontrada: instale o PostgreSQL client (pg_dump) ou Docker Desktop."
  }

  if (-not $success -or -not (Test-Path $filePath)) { throw "Dump não foi gerado. Verifique logs acima." }
  Write-Host "Dump concluído com sucesso: $filePath" -ForegroundColor Green
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue | Out-Null
  $pwdPlain = $null
}
