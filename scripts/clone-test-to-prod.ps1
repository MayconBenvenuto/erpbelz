<#
  Script: clone-test-to-prod.ps1
  Objetivo: Clonar COMPLETAMENTE o banco de TESTE para PRODUÇÃO com etapa intermediária (schema staging_clone) e swap seguro.
  Uso (PowerShell):
    .\scripts\clone-test-to-prod.ps1 -TestUrl $Env:TEST_DB_URL -ProdUrl $Env:PROD_DB_URL -Mode Swap -Force

  Parâmetros:
    -TestUrl    URL Postgres completa (fonte - teste)
    -ProdUrl    URL Postgres completa (destino - produção)
    -Mode       Swap (renomeia schemas) ou Copy (copia só tabelas principais)
    -Force      Não pede confirmação interativa
    -SkipBackups   Pula criação de backups (NÃO recomendado)
    -KeepOldSchema Não remove schema antigo após sucesso (recomendado deixar para revisão manual)

  Pré-requisitos:
    - psql e pg_dump no PATH
    - Permissões suficientes no cluster Supabase
    - Janela de manutenção (sem writes concorrentes)

  Segurança:
    - BACKUP SEMPRE antes
    - JWT_SECRET deve ser rotacionado após clone se quiser separar ambientes logicamente
    - NÃO execute em produção se não tiver certeza que a base de teste é a fonte correta
    - Não grava segredos em disco além dos dumps gerados localmente

  Saídas:
    - Backups: prod_before_clone_<timestamp>.dump / test_source_<timestamp>.dump
    - Dump plain reescrito: test_plain_staging_<timestamp>.sql (removível após sucesso)
    - Logs em tela

  Modo Swap (padrão):
    1. Cria schema staging_clone
    2. Restaura teste dentro staging_clone (reescrevendo schema references)
    3. Renomeia public -> old_public_<timestamp>, staging_clone -> public
    4. Mantém old_public_* para rollback rápido

  Modo Copy:
    - Mantém schema public e só substitui tabelas listadas em $TablesToCopy
    - Cria backups tabelares individuais

  Rollback Swap:
    ALTER SCHEMA public RENAME TO broken_public_<ts>;
    ALTER SCHEMA old_public_<ts_original> RENAME TO public;
#>

param(
  [Parameter(Mandatory=$true)] [string]$TestUrl,
  [Parameter(Mandatory=$true)] [string]$ProdUrl,
  [ValidateSet('Swap','Copy')] [string]$Mode = 'Swap',
  [switch]$Force,
  [switch]$SkipBackups,
  [switch]$KeepOldSchema
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-IfEmpty($name,$value) {
  if (-not $value -or $value.Trim() -eq '') { throw "Parametro $name vazio" }
}

Stop-IfEmpty TestUrl $TestUrl
Stop-IfEmpty ProdUrl $ProdUrl

Write-Host "=== Clone TEST -> PROD iniciado ===" -ForegroundColor Cyan
Write-Host "Modo: $Mode"

if (-not $Force) {
  Write-Host "ATENÇÃO: Isso irá substituir dados da PRODUÇÃO pelo conteúdo de TESTE." -ForegroundColor Yellow
  $resp = Read-Host "Digite CLONE para confirmar"
  if ($resp -ne 'CLONE') { Write-Warning 'Abortado pelo usuário.'; exit 1 }
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupProd = "prod_before_clone_$timestamp.dump"
$backupTest = "test_source_$timestamp.dump"
$plainDump  = "test_plain_$timestamp.sql"
$plainStage = "test_plain_staging_$timestamp.sql"
$oldSchema  = "old_public_$timestamp"

function Run($cmd) {
  Write-Host "[CMD] $cmd" -ForegroundColor DarkGray
  if (Get-Command bash -ErrorAction SilentlyContinue) {
    $out = & bash -lc $cmd 2>&1
  } else {
    # Executa diretamente em PowerShell (com parsing simples). Para redirecionamentos complexos use fallback manual.
    $out = Invoke-Expression $cmd 2>&1
  }
  if ($LASTEXITCODE -ne 0) { Write-Host $out -ForegroundColor Red; throw "Falha comando: $cmd" }
  if ($out) { Write-Host $out }
}

if (-not $SkipBackups) {
  Write-Host "== Backups" -ForegroundColor Cyan
  Run "pg_dump '$ProdUrl' --format=custom --file=$backupProd"
  Run "pg_dump '$TestUrl' --format=custom --file=$backupTest"
} else { Write-Warning "Backups pulados por --SkipBackups" }

Write-Host "== Dump plain de teste" -ForegroundColor Cyan
if (Get-Command bash -ErrorAction SilentlyContinue) {
  Run "pg_dump '$TestUrl' --no-owner --no-privileges --format=plain --schema=public > $plainDump"
} else {
  Write-Host "Gerando dump plain (sem bash): pg_dump pode não suportar redirecionamento via Invoke-Expression, usando Start-Process" -ForegroundColor Yellow
  $pgArgs = "--no-owner --no-privileges --format=plain --schema=public --file=$plainDump $TestUrl"
  Write-Host "[CMD] pg_dump $pgArgs" -ForegroundColor DarkGray
  & pg_dump $TestUrl --no-owner --no-privileges --format=plain --schema=public --file=$plainDump
  if ($LASTEXITCODE -ne 0) { throw "Falha pg_dump plain" }
}

Write-Host "== Reescrevendo schema para staging_clone" -ForegroundColor Cyan
# Usar sed se disponível, senão fallback PowerShell
if (Get-Command sed -ErrorAction SilentlyContinue) {
  Run "sed -e 's/SET search_path = public;/SET search_path = staging_clone;/' -e 's/public\\./staging_clone./g' $plainDump > $plainStage"
} else {
  $content = Get-Content $plainDump -Raw
  $content = $content -replace 'SET search_path = public;', 'SET search_path = staging_clone;'
  $content = $content -replace 'public\.', 'staging_clone.'
  Set-Content -Path $plainStage -Value $content -Encoding UTF8
}

Write-Host "== Criando schema staging_clone em produção" -ForegroundColor Cyan
Run "psql '$ProdUrl' -v ON_ERROR_STOP=1 -c \"CREATE SCHEMA IF NOT EXISTS staging_clone;\""

Write-Host "== Restaurando dump de teste dentro staging_clone" -ForegroundColor Cyan
Run "psql '$ProdUrl' -v ON_ERROR_STOP=1 -f $plainStage"

Write-Host "== Verificando contagens staging_clone" -ForegroundColor Cyan
Run "psql '$ProdUrl' -c \"SELECT 'staging_clone.propostas' AS tabela, COUNT(*) FROM staging_clone.propostas;\""

if ($Mode -eq 'Swap') {
  Write-Host "== Swap de schemas (public -> $oldSchema, staging_clone -> public)" -ForegroundColor Cyan
  Run "psql '$ProdUrl' -v ON_ERROR_STOP=1 -c \"ALTER SCHEMA public RENAME TO $oldSchema; ALTER SCHEMA staging_clone RENAME TO public;\""
  if (-not $KeepOldSchema) {
    Write-Host "Schema antigo preservado como $oldSchema (remova manualmente após validar)." -ForegroundColor Yellow
  }
} else {
  Write-Host "== Modo Copy: copiando tabelas principais" -ForegroundColor Cyan
  $TablesToCopy = @('propostas','usuarios','solicitacoes','propostas_notas','propostas_tags')
  foreach ($tbl in $TablesToCopy) {
    Write-Host "-- Tabela $tbl" -ForegroundColor DarkCyan
    Run "psql '$ProdUrl' -v ON_ERROR_STOP=1 -c \"CREATE TABLE IF NOT EXISTS public.${tbl}_backup_$timestamp AS SELECT * FROM public.$tbl; TRUNCATE public.$tbl RESTART IDENTITY CASCADE; INSERT INTO public.$tbl SELECT * FROM staging_clone.$tbl;\""
  }
}

Write-Host "== ANALYZE" -ForegroundColor Cyan
Run "psql '$ProdUrl' -c \"ANALYZE;\""

Write-Host "== Índices em propostas (pós-clone)" -ForegroundColor Cyan
Run "psql '$ProdUrl' -c \"SELECT indexname FROM pg_indexes WHERE tablename='propostas';\""

Write-Host "== Teste trigger updated_at" -ForegroundColor Cyan
Run "psql '$ProdUrl' -c \"UPDATE propostas SET status=status LIMIT 1; SELECT id, updated_at FROM propostas ORDER BY updated_at DESC LIMIT 1;\""

Write-Host "== Limpeza opcional de sessões (ajuste tabela se existir)" -ForegroundColor Cyan
try { Run "psql '$ProdUrl' -c \"DELETE FROM sessoes;\"" } catch { Write-Warning 'Tabela sessoes não encontrada ou falhou — ignorando.' }

Write-Host "=== Clone concluído com sucesso ===" -ForegroundColor Green
Write-Host "Revise dados e depois (opcional) DROP SCHEMA $oldSchema CASCADE (modo Swap) após validação." -ForegroundColor Yellow

<#
Rollback rápido (modo Swap) se detectar problema imediato:
  psql "$ProdUrl" -c "ALTER SCHEMA public RENAME TO broken_public_$timestamp; ALTER SCHEMA $oldSchema RENAME TO public;"
#>
