$ErrorActionPreference = 'Stop'

$databaseSecret = Read-Host 'Paste the main Supabase database password' -AsSecureString
$backupSecret = Read-Host 'Create a backup passphrase (at least 16 characters)' -AsSecureString
$databaseCredential = [System.Management.Automation.PSCredential]::new('postgres', $databaseSecret)
$backupCredential = [System.Management.Automation.PSCredential]::new('snapshot', $backupSecret)

try {
  $env:PRODUCTION_DB_PASSWORD = $databaseCredential.GetNetworkCredential().Password
  $env:PRODUCTION_BACKUP_PASSPHRASE = $backupCredential.GetNetworkCredential().Password

  pnpm run production:snapshot
  if ($LASTEXITCODE -ne 0) {
    throw "Production snapshot failed with exit code $LASTEXITCODE"
  }
} finally {
  Remove-Item Env:PRODUCTION_DB_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PRODUCTION_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  Remove-Variable databaseSecret, backupSecret, databaseCredential, backupCredential -ErrorAction SilentlyContinue
}
