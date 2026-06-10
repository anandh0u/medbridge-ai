param(
    [string[]] $Regions = @("southeastasia", "eastus2", "swedencentral"),
    [string[]] $ModelPatterns = @(
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-35-turbo",
        "gpt4.1",
        "gpt4.1-mini",
        "gpt4.1-nano",
        "gpt-5-mini",
        "o4-mini"
    )
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

$account = & $az.Source account show -o json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $account) {
    throw "Azure CLI is not logged in. Run: az login"
}

$rows = foreach ($region in $Regions) {
    $json = & $az.Source cognitiveservices usage list --location $region -o json 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $json) {
        continue
    }

    $usage = $json | ConvertFrom-Json
    foreach ($entry in $usage) {
        $name = [string] $entry.name.value
        $matched = $false
        foreach ($pattern in $ModelPatterns) {
            if ($name -like "*$pattern*") {
                $matched = $true
                break
            }
        }

        if (
            $matched -and
            $name -like "OpenAI.*" -and
            $name -notlike "*finetune*" -and
            $name -notlike "*Batch*" -and
            $name -notlike "*embedding*" -and
            $name -notlike "*transcribe*"
        ) {
            [pscustomobject]@{
                Region = $region
                QuotaName = $name
                Used = [int] $entry.currentValue
                Limit = [int] $entry.limit
                Available = ([int] $entry.limit - [int] $entry.currentValue)
            }
        }
    }
}

if (-not $rows) {
    Write-Output "No matching Azure OpenAI chat quota entries were found."
    exit 0
}

$rows | Sort-Object Region, QuotaName | Format-Table -AutoSize
