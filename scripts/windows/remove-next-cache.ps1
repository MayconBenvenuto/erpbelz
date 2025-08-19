$ErrorActionPreference = 'Stop'

$ProjectDir = (Get-Location).Path
$NextDir = Join-Path $ProjectDir '.next'

Write-Host "Projeto: $ProjectDir" -ForegroundColor Cyan

if (Test-Path $NextDir) {
  # Se for junction, remover link apenas
  $attrs = (Get-Item $NextDir).Attributes
  if ($attrs -band [IO.FileAttributes]::ReparsePoint) {
    cmd /c rmdir "$NextDir" | Out-Null
    Write-Host 'Junction .next removida.' -ForegroundColor Yellow
  } else {
    Remove-Item -LiteralPath $NextDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host 'Pasta .next removida.' -ForegroundColor Yellow
  }
}

Write-Host 'Feito.' -ForegroundColor Green
