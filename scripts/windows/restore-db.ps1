#Requires -Version 5.1
<#
  restore-db.ps1
  Restaura um dump no banco de destino (Supabase Postgres) usando pg_restore (formato .dump) ou psql (.sql).

  Parâmetros:
    -DumpFile <caminho>      Caminho para o arquivo .dump (pg_dump -F c) ou .sql (plain).
    -PoolerUrl <url>         Connection string do Pooler do projeto destino (sem senha em texto; a senha vem via env).
    -Schema <nome>           Schema alvo (default: public).
    -Clean                   Se presente, executa --clean --if-exists para recriar objetos (recomendado para ambiente vazio).

  Senha:
    - Defina $env:SUPABASE_TARGET_DB_PASSWORD com a senha do banco de destino ou informe no prompt interativo.

  Exemplo:
    $env:SUPABASE_TARGET_DB_PASSWORD = "senha";
    powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/windows/restore-db.ps1 `
      -DumpFile ./backups/belz-crm_20250821_113358.dump `
      -PoolerUrl "postgresql://postgres.<ref>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres" `
      -Clean
#>

param(
  [Parameter(Mandatory=$true)][string]$DumpFile,
  [Parameter(Mandatory=$true)][string]$PoolerUrl,
  [string]$Schema = 'public',
  [switch]$Clean
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Parse-Conn([string]$url) {
  try { $uri = [Uri]$url } catch { throw "PoolerUrl inválida: $url" }
  $pgHost = $uri.Host
  $port   = if ($uri.Port -gt 0) { $uri.Port } else { 6543 }
  $db     = ($uri.AbsolutePath.Trim('/')); if (-not $db) { $db = 'postgres' }
  # usuário: parte do UserInfo sem senha
  $userInfo = $uri.UserInfo
  $user = $userInfo.Split(':')[0]
  if (-not $user) { $user = 'postgres' }
  return [pscustomobject]@{ Host = $pgHost; Port = $port; Db = $db; User = $user }
}

function Get-Password() {
  if ($env:SUPABASE_TARGET_DB_PASSWORD) { return $env:SUPABASE_TARGET_DB_PASSWORD }
  Write-Host "Digite a senha do banco de DESTINO:" -ForegroundColor Yellow
  $sec = Read-Host -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Has-Command([string]$name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Path -LiteralPath $DumpFile)) { throw "Arquivo não encontrado: $DumpFile" }
$conn = Parse-Conn $PoolerUrl
$pwdPlain = Get-Password
if (-not $pwdPlain) { throw "Senha não fornecida. Defina SUPABASE_TARGET_DB_PASSWORD ou informe no prompt." }

Write-Host "Destino: $($conn.Host):$($conn.Port) DB=$($conn.Db) User=$($conn.User) Schema=$Schema" -ForegroundColor Cyan
Write-Host "Dump: $DumpFile" -ForegroundColor Cyan

$env:PGPASSWORD = $pwdPlain
try {
  $ext = [IO.Path]::GetExtension($DumpFile).ToLowerInvariant()
  $useRestore = ($ext -eq '.dump' -or $ext -eq '.dmp')

  if ($useRestore) {
    if (-not (Has-Command 'pg_restore')) { throw "pg_restore não encontrado. Instale o PostgreSQL client 17 ou ajuste PATH." }
    $args = @(
      '-h', $conn.Host,
      '-p', $conn.Port,
      '-U', $conn.User,
      '-d', $conn.Db,
      '-n', $Schema,
      '--no-owner', '--no-privileges'
    )
    if ($Clean) { $args += @('--clean','--if-exists') }
    $args += @('-v', '-1', $DumpFile)

    Write-Host "Executando pg_restore..." -ForegroundColor Green
    & pg_restore @args
    if ($LASTEXITCODE -ne 0) { throw "pg_restore retornou código $LASTEXITCODE" }
  }
  else {
    if (-not (Has-Command 'psql')) { throw "psql não encontrado. Instale o PostgreSQL client 17 ou ajuste PATH." }
    $pre = @()
    if ($Clean) {
      # limpar objetos do schema (drop cascade cuidadoso)
      # Atenção: em PowerShell, use crase (`) para escapar aspas dentro de strings interpoladas
      $pre = @('-v','ON_ERROR_STOP=1','-c', "DROP SCHEMA IF EXISTS `"$Schema`" CASCADE; CREATE SCHEMA `"$Schema`";")
    }
    $args = @(
      '-h', $conn.Host,
      '-p', $conn.Port,
      '-U', $conn.User,
      '-d', $conn.Db
    )
    Write-Host "Executando psql..." -ForegroundColor Green
    if ($pre.Length -gt 0) { & psql @args @pre; if ($LASTEXITCODE -ne 0) { throw "psql (pre) retornou código $LASTEXITCODE" } }
    & psql @args -v ON_ERROR_STOP=1 -f $DumpFile
    if ($LASTEXITCODE -ne 0) { throw "psql retornou código $LASTEXITCODE" }
  }

  Write-Host "Restauração concluída com sucesso." -ForegroundColor Green
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue | Out-Null
  $pwdPlain = $null
}
