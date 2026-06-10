param(
    [string] $ResourceGroup = "rg-medbridge-ai",
    [string] $AccountName = "anandhu",
    [string] $DeploymentName = "gpt-4.1-mini",
    [string] $ModelName = "gpt-4.1-mini",
    [string] $ModelVersion = "2025-04-14",
    [string] $SkuName = "GlobalStandard",
    [int] $SkuCapacity = 1
)

$ErrorActionPreference = "Stop"

$az = Get-Command az -ErrorAction SilentlyContinue
if (-not $az) {
    $defaultAz = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
    if (Test-Path $defaultAz) {
        $az = [pscustomobject]@{ Source = $defaultAz }
    }
}

if (-not $az) {
    throw "Azure CLI was not found. Install it with: winget install -e --id Microsoft.AzureCLI"
}

$accountJson = & $az.Source cognitiveservices account show `
    --name $AccountName `
    --resource-group $ResourceGroup `
    -o json

$account = $accountJson | ConvertFrom-Json
$region = $account.location

$quotaJson = & $az.Source cognitiveservices usage list --location $region -o json
$usage = $quotaJson | ConvertFrom-Json
$quotaModelName = $ModelName -replace "^gpt-([0-9])", "gpt`$1"
$quotaNames = @(
    "OpenAI.$SkuName.$ModelName",
    "OpenAI.$SkuName.$quotaModelName"
)

$quota = $usage | Where-Object { $quotaNames -contains $_.name.value } | Select-Object -First 1
if (-not $quota) {
    throw "No quota entry found for $ModelName / $SkuName in $region. Check quota with scripts/check-azure-openai-quota.ps1."
}

$available = [int] $quota.limit - [int] $quota.currentValue
if ($available -lt $SkuCapacity) {
    throw "Insufficient quota for $($quota.name.value) in $region. Available: $available, required: $SkuCapacity."
}

& $az.Source cognitiveservices account deployment create `
    --resource-group $ResourceGroup `
    --name $AccountName `
    --deployment-name $DeploymentName `
    --model-name $ModelName `
    --model-version $ModelVersion `
    --model-format OpenAI `
    --sku-name $SkuName `
    --sku-capacity $SkuCapacity `
    -o table

Write-Output ""
Write-Output "Deployment created. Set these in .env:"
Write-Output "MODEL_DEPLOYMENT_NAME=$DeploymentName"
Write-Output "MEDBRIDGE_USE_LIVE_FOUNDRY=true"
