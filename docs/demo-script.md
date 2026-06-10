# MedBridge AI Demo Script

Use this flow for the hackathon video if Azure for Students model quota blocks
live Foundry model deployment.

1. Show the public GitHub repository and README.
2. Show the Microsoft Foundry project exists in the portal.
3. Explain that Azure for Students allowed the project but blocked model quota,
   so the demo uses the local deterministic fallback documented in the README.
4. Run the reasoning agent:

```powershell
cd E:\loopyy\medbridge-ai
python -m agent.agent
```

5. Point out the three IQ layers in the JSON:
   - `medical` for Foundry IQ
   - `history` for Work IQ
   - `trends` for Fabric IQ
6. Run the emergency case:

```powershell
@'
import asyncio
from agent.agent import run_triage

async def main():
    result = await run_triage(
        "chest pain and difficulty breathing",
        "user_001",
        "Thrissur, Kerala, India",
    )
    print(result["risk_level"])
    print(result["recommendation"])

asyncio.run(main())
'@ | python -
```

7. Show that the output returns `CRITICAL` and `EMERGENCY FLAG`.
8. Show the React dashboard:

```powershell
uvicorn agent.server:app --host 127.0.0.1 --port 8088
```

In another terminal:

```powershell
cd E:\loopyy\medbridge-ai\frontend
npm run dev
```

9. Show symptom triage, Work IQ timeline, Fabric IQ panel, citations, and doctor
   briefing.
10. Close with the safety message: MedBridge AI does not diagnose and always
    recommends consulting a licensed medical professional.

