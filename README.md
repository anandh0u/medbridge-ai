# MedBridge AI

MedBridge AI is a community health navigator agent for the Microsoft Agents
League Hackathon. It helps underserved communities describe symptoms, retrieve
cited medical context, recall relevant personal history, incorporate community
risk signals, and generate a Microsoft 365-compatible doctor briefing.

MedBridge AI does not diagnose. It uses cautious language, cites medical
claims, flags emergency symptoms, and recommends licensed professional care.

## Architecture

```text
User symptoms
    |
    v
React + Vite dashboard
    |
    v
FastAPI triage gateway (/triage, /responses)
    |
    v
MedBridge reasoning orchestrator
    |
    +--> Foundry IQ connector -> cited medical knowledge
    |
    +--> Work IQ connector    -> appointments, history, care events
    |
    +--> Fabric IQ connector  -> regional trends and risk factors
    |
    v
Risk synthesis + doctor briefing
    |
    +--> Dashboard panels
    |
    +--> Microsoft 365-compatible Markdown/HTML report
```

## Hackathon Tracks

Creative Apps - GitHub Copilot:
The React dashboard includes symptom entry, risk status, appointment timeline,
community trend context, citations, loading states, and error handling.

Reasoning Agents - Microsoft Foundry:
The Python agent implements an explicit seven-step reasoning flow:

1. Receive symptoms.
2. Query Foundry IQ for cited medical knowledge.
3. Query Work IQ for patient history.
4. Query Fabric IQ for regional risk.
5. Synthesize low, medium, or high risk.
6. Generate a structured doctor briefing.
7. Return dashboard-ready JSON.

Enterprise Agents - Microsoft 365 Copilot:
`m365/briefing_generator.py` turns the structured briefing into Markdown and
Word-friendly HTML with sections for patient summary, symptoms, history,
community context, recommended tests, next steps, and citations.

## Microsoft IQ Layers

Foundry IQ:
`agent/tools.py::foundry_iq_search` uses `DefaultAzureCredential` and can query
an Azure AI Search index when `MEDBRIDGE_FOUNDRY_IQ_SEARCH_ENDPOINT` and
`MEDBRIDGE_FOUNDRY_IQ_SEARCH_INDEX_NAME` are set. Without cloud configuration,
it returns deterministic demo citations from CDC and MedlinePlus.

Work IQ:
`agent/tools.py::work_iq_recall` uses a project connection name if configured
and reads patient history from `WORK_IQ_HISTORY_FILE` for local demos. In
production, map this adapter to approved Microsoft Graph or Work IQ memory.

Fabric IQ:
`agent/tools.py::fabric_iq_trends` uses a project connection name if configured
and reads regional trend data from `FABRIC_IQ_DATA_FILE` for local demos. In
production, map this adapter to a Fabric semantic model, OneLake shortcut, or
API-backed community health dataset.

## Project Structure

```text
medbridge-ai/
  agent/
    agent.py
    prompts.py
    reasoning.py
    server.py
    tools.py
  data/
    fabric_iq_trends.json
    work_iq_history.json
  frontend/
    src/
      App.tsx
      Briefing.tsx
      RiskPanel.tsx
      SymptomInput.tsx
      Timeline.tsx
      api.ts
      styles.css
      types.ts
  infra/
    main.bicep
  m365/
    briefing_generator.py
  agent.yaml
  Dockerfile
  requirements.txt
  .env.example
```

## Local Setup

From the project root:

```powershell
cd E:\loopyy\medbridge-ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Run the Python triage API:

```powershell
uvicorn agent.server:app --host 127.0.0.1 --port 8088
```

In another terminal, run the frontend:

```powershell
cd E:\loopyy\medbridge-ai\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL and run the default symptom example. To test the emergency
path, enter:

```text
I have chest pain and shortness of breath.
```

## Local Python CLI

```powershell
cd E:\loopyy\medbridge-ai
python -m agent.agent --symptoms "mild headache and fatigue" --user-id demo-patient-001 --region "South India"
```

## Microsoft 365 Briefing Output

```python
from agent.agent import run_triage
from m365.briefing_generator import write_briefing_files

result = run_triage(
    symptoms="mild headache and fatigue",
    user_id="demo-patient-001",
    region="South India",
)

write_briefing_files(result["doctor_briefing"], "./out")
```

The generated HTML opens cleanly in Microsoft Word and can be saved as `.docx`
for Microsoft 365 workflows.

## Azure Foundry Setup

Deploy the starter Foundry resource, project, and `gpt-4.1-mini` deployment:

```powershell
az login
az group create --name medbridge-rg --location eastus2
az deployment group create `
  --resource-group medbridge-rg `
  --template-file infra/main.bicep `
  --parameters aiFoundryName=<unique-foundry-name> aiProjectName=medbridge-ai
```

Set `.env` after deployment:

```powershell
AZURE_AI_PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_DEPLOYMENT_NAME=gpt-4.1-mini
```

Create the Agent Service definition with the prompt and function tools:

```powershell
python - <<'PY'
from agent.agent import create_foundry_agent
print(create_foundry_agent("medbridge-ai"))
PY
```

The local container metadata is in `agent.yaml`. For a production hosted-agent
deployment, publish the Docker image to ACR and deploy it through Foundry/AZD
using the generated `Dockerfile`, `agent.yaml`, and environment variables. Do
not set `FOUNDRY_*` variables manually; Foundry injects those at runtime.

## Safety Policy

The system prompt in `agent/prompts.py` enforces:

- No diagnosis.
- "This may indicate" language for triage.
- Citations for medical claims.
- Emergency banner for red-flag symptoms.
- Licensed professional care recommendation.
- Seven explicit reasoning steps.

## Demo Video Placeholder

```text
Demo video: <paste final hackathon video URL here>
Suggested flow:
1. Show low-risk headache + fatigue.
2. Show Work IQ timeline and Fabric IQ panel.
3. Show generated doctor briefing.
4. Show high-risk chest pain + shortness of breath emergency banner.
5. Briefly show Foundry project, model deployment, and agent definition.
```

## References

- Microsoft Foundry Bicep quickstart:
  https://learn.microsoft.com/en-us/azure/foundry/how-to/create-resource-template
- Azure AI Foundry samples:
  https://github.com/azure-ai-foundry/foundry-samples
- MedlinePlus headache danger signs:
  https://medlineplus.gov/ency/patientinstructions/000424.htm
- MedlinePlus breathing difficulty first aid:
  https://medlineplus.gov/ency/article/000007.htm
- MedlinePlus chest pain:
  https://medlineplus.gov/ency/article/003079.htm
- CDC flu signs and symptoms:
  https://www.cdc.gov/flu/signs-symptoms/index.html

