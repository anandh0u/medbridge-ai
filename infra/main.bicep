@description('Name of the Microsoft Foundry resource.')
param aiFoundryName string = 'medbridge-ai-foundry'

@description('Name of the Foundry project.')
param aiProjectName string = '${aiFoundryName}-project'

@description('Azure region for the Foundry resource and project.')
param location string = resourceGroup().location

@description('Model deployment name used by the MedBridge agent.')
param modelDeploymentName string = 'gpt-4.1-mini'

@description('Model version for gpt-4.1-mini.')
param modelVersion string = '2025-04-14'

resource aiFoundry 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: aiFoundryName
  location: location
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: true
    customSubDomainName: aiFoundryName
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}

resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: aiFoundry
  name: aiProjectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: 'MedBridge AI'
    description: 'Community health navigator agent for triage support and doctor briefings.'
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: aiFoundry
  name: modelDeploymentName
  sku: {
    name: 'GlobalStandard'
    capacity: 1
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1-mini'
      version: modelVersion
    }
  }
}

output foundryEndpoint string = aiFoundry.properties.endpoint
output projectName string = aiProject.name
output projectEndpoint string = '${aiFoundry.properties.endpoint}api/projects/${aiProject.name}'
output modelDeployment string = modelDeployment.name

