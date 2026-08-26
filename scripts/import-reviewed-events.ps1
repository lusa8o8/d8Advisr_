$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot

$adminEmail = Read-Host 'Main D8 admin email'
$adminSecret = Read-Host 'Main D8 admin password' -AsSecureString
$adminCredential = [System.Management.Automation.PSCredential]::new($adminEmail, $adminSecret)

try {
  Set-Location $workspaceRoot
  $env:D8_ADMIN_EMAIL = $adminEmail
  $env:D8_ADMIN_PASSWORD = $adminCredential.GetNetworkCredential().Password

  & node scripts/import-reviewed-events.mjs --apply --confirm-main
  if ($LASTEXITCODE -ne 0) {
    throw "Reviewed event import failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:D8_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:D8_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable adminEmail, adminSecret, adminCredential -ErrorAction SilentlyContinue
}
