"""Main MedBridge AI Foundry reasoning agent."""

from __future__ import annotations

import asyncio
import inspect
import json
import os
from typing import Any

from dotenv import load_dotenv

from azure.ai.agents.models import FunctionTool, ToolSet
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

from .prompts import SYSTEM_PROMPT
from .reasoning import run_parallel_iq, synthesize_risk
from .tools import fabric_iq_trends, foundry_iq_search, work_iq_recall


JsonDict = dict[str, Any]


def _project_client() -> AIProjectClient:
    endpoint = os.getenv("AZURE_AI_PROJECT_ENDPOINT")
    if not endpoint:
        raise RuntimeError("AZURE_AI_PROJECT_ENDPOINT is required to create the Foundry agent.")
    credential = DefaultAzureCredential(exclude_interactive_browser_credential=False)
    return AIProjectClient(endpoint=endpoint, credential=credential)


def create_foundry_hosted_agent(agent_name: str = "medbridge-ai") -> JsonDict:
    """Create a Foundry Agent Service agent and register all three IQ tools."""
    load_dotenv(override=False)
    client = _project_client()
    model = os.getenv("MODEL_DEPLOYMENT_NAME", "gpt-4.1-mini")
    toolset = ToolSet()
    toolset.add(FunctionTool([foundry_iq_search, work_iq_recall, fabric_iq_trends]))
    agent = client.agents.create_agent(
        model=model,
        name=agent_name,
        instructions=SYSTEM_PROMPT,
        toolset=toolset,
    )
    return {
        "agent_id": getattr(agent, "id", None),
        "agent_name": getattr(agent, "name", agent_name),
        "model": model,
        "status": "created",
    }


async def run_triage(symptoms: str, user_id: str, region: str) -> JsonDict:
    """Run all three IQ layers, synthesize risk, and return a full result."""
    load_dotenv(override=False)
    context = await run_parallel_iq(symptoms=symptoms, user_id=user_id, region=region)
    synthesis = synthesize_risk(
        medical=context["medical"],
        history=context["history"],
        trends=context["trends"],
    )
    return {
        "agent": "MedBridge AI",
        "model": os.getenv("MODEL_DEPLOYMENT_NAME", "gpt-4.1-mini"),
        "input": {
            "symptoms": symptoms,
            "user_id": user_id,
            "region": region,
        },
        "iq_context": context,
        **synthesis,
    }


def _serialize(value: Any) -> str:
    def default(item: Any) -> str:
        if inspect.isawaitable(item):
            return "<awaitable>"
        return str(item)

    return json.dumps(value, indent=2, ensure_ascii=False, default=default)


async def _main() -> None:
    symptoms = "headache, fever, and body aches for 3 days"
    user_id = "user_001"
    region = "Thrissur, Kerala, India"
    result = await run_triage(symptoms=symptoms, user_id=user_id, region=region)
    print(_serialize(result))


if __name__ == "__main__":
    asyncio.run(_main())

