param(
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $OutputPath = Join-Path $workspaceRoot "local-backups\main-preflight-$timestamp.json.enc"
}

function ConvertFrom-SecureValue {
  param([System.Security.SecureString]$Value)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$databasePassword = $null
$backupPassphrase = $null
$backupConfirmation = $null

try {
  Set-Location $workspaceRoot

  $databaseSecret = Read-Host 'Paste the MAIN database password' -AsSecureString
  $backupSecret = Read-Host 'Create a backup encryption passphrase (16+ characters)' -AsSecureString
  $confirmationSecret = Read-Host 'Repeat the backup encryption passphrase' -AsSecureString

  $databasePassword = ConvertFrom-SecureValue $databaseSecret
  $backupPassphrase = ConvertFrom-SecureValue $backupSecret
  $backupConfirmation = ConvertFrom-SecureValue $confirmationSecret

  if ($backupPassphrase.Length -lt 16) {
    throw 'The backup encryption passphrase must contain at least 16 characters.'
  }
  if ($backupPassphrase -cne $backupConfirmation) {
    throw 'The two backup encryption passphrases do not match.'
  }

  $env:PRODUCTION_DB_PASSWORD = $databasePassword
  $env:PRODUCTION_BACKUP_PASSPHRASE = $backupPassphrase
  $env:PRODUCTION_BACKUP_PATH = $OutputPath

  & pnpm run production:snapshot
  if ($LASTEXITCODE -ne 0) {
    throw "Snapshot command failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:PRODUCTION_DB_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PRODUCTION_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  Remove-Item Env:PRODUCTION_BACKUP_PATH -ErrorAction SilentlyContinue
  $databasePassword = $null
  $backupPassphrase = $null
  $backupConfirmation = $null
}
