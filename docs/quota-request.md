# Azure OpenAI Quota Request

Current blocker:

- Subscription: Azure for Students
- Existing Foundry resource: `anandhu`
- Existing region: `Southeast Asia` / `southeastasia`
- Resource group: `rg-medbridge-ai`
- Resource ID:

```text
/subscriptions/a5daf2cd-135e-47ac-9689-a4b20f7ebcce/resourceGroups/rg-medbridge-ai/providers/Microsoft.CognitiveServices/accounts/anandhu
```

The model catalog shows `gpt-4.1-mini` is available on the resource, but quota
for the chat deployment is currently zero:

```text
OpenAI.GlobalStandard.gpt4.1-mini
Used: 0
Limit: 0
Available: 0
```

Request this quota:

```text
Service: Azure OpenAI / Azure AI Foundry
Region: Southeast Asia
Model: gpt-4.1-mini
SKU: GlobalStandard
Requested quota: 10K TPM
Current quota: 0 TPM
```

Business justification:

```text
I am building MedBridge AI for the Microsoft Agents League Hackathon. It is a
community health navigator reasoning agent hosted in Microsoft Foundry Agent
Service. The agent uses gpt-4.1-mini with Foundry IQ, Work IQ, and Fabric IQ
context to triage symptoms and generate a doctor briefing.

Expected demo traffic is low: fewer than 100 requests per day, approximately
2,000 input/output tokens per request. A 10K TPM quota in Southeast Asia is
enough for the hackathon demo and testing. Current quota is 0 TPM, so I cannot
create the required model deployment in my existing Southeast Asia Foundry
resource.
```

After quota is approved, deploy the model:

```powershell
cd E:\loopyy\medbridge-ai
.\scripts\deploy-model-after-quota.ps1
```

Then enable live Foundry mode in `.env`:

```env
MODEL_DEPLOYMENT_NAME=gpt-4.1-mini
MEDBRIDGE_USE_LIVE_FOUNDRY=true
```
