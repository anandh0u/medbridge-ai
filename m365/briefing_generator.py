"""Microsoft 365-compatible doctor briefing formatting."""

from __future__ import annotations

from html import escape
from pathlib import Path
from typing import Any


JsonDict = dict[str, Any]


def _bullets(items: list[Any]) -> str:
    if not items:
        return "- Not recorded\n"
    lines: list[str] = []
    for item in items:
        if isinstance(item, dict):
            summary = item.get("summary") or item.get("claim") or str(item)
            date = item.get("date")
            prefix = f"{date}: " if date else ""
            lines.append(f"- {prefix}{summary}")
        else:
            lines.append(f"- {item}")
    return "\n".join(lines) + "\n"


def _html_list(items: list[Any]) -> str:
    if not items:
        return "<ul><li>Not recorded</li></ul>"
    rows: list[str] = []
    for item in items:
        if isinstance(item, dict):
            summary = item.get("summary") or item.get("claim") or str(item)
            date = item.get("date")
            text = f"{date}: {summary}" if date else summary
        else:
            text = str(item)
        rows.append(f"<li>{escape(text)}</li>")
    return "<ul>" + "".join(rows) + "</ul>"


def format_briefing_document(briefing: JsonDict) -> JsonDict:
    """Return Markdown, HTML, and plain text versions of a briefing dict."""
    patient = briefing.get("patient_summary", {})
    community = briefing.get("community_context", {})
    citations = briefing.get("citations", [])
    symptoms = briefing.get("reported_symptoms", "Not recorded")
    history = briefing.get("health_history", [])
    tests = briefing.get("recommended_tests", [])
    steps = briefing.get("recommended_next_steps", [])

    title = f"MedBridge Doctor Briefing - {patient.get('patient_id', 'patient')}"
    markdown = f"""# {title}

## Patient Summary
- Patient ID: {patient.get('patient_id', 'Unknown')}
- Region: {patient.get('region', 'Unknown')}
- Risk level: {patient.get('risk_level', 'Unknown')}
- Risk score: {patient.get('risk_score', 'Unknown')}

## Reported Symptoms
{symptoms}

## Health History
{_bullets(history)}
## Community Context
- Condition family: {community.get('condition', 'Unknown')}
- Trend: {community.get('trend', 'Unknown')}
- Regional risk score: {community.get('regional_risk_score', 'Unknown')}

Risk factors:
{_bullets(community.get('risk_factors', []))}
## Recommended Next Steps
{_bullets(steps)}
## Recommended Tests
{_bullets(tests)}
## Citations
{_bullets([source.get('title') or source.get('citation') or source for source in citations])}
"""

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>{escape(title)}</title>
  <style>
    body {{ font-family: Aptos, Calibri, Arial, sans-serif; line-height: 1.45; color: #111827; }}
    h1 {{ color: #0f766e; font-size: 24pt; }}
    h2 {{ color: #155e75; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }}
    .meta {{ background: #f3f4f6; padding: 12px; border-left: 4px solid #0f766e; }}
  </style>
</head>
<body>
  <h1>{escape(title)}</h1>
  <section class="meta">
    <p><strong>Patient ID:</strong> {escape(str(patient.get('patient_id', 'Unknown')))}</p>
    <p><strong>Region:</strong> {escape(str(patient.get('region', 'Unknown')))}</p>
    <p><strong>Risk level:</strong> {escape(str(patient.get('risk_level', 'Unknown')))}</p>
    <p><strong>Risk score:</strong> {escape(str(patient.get('risk_score', 'Unknown')))}</p>
  </section>
  <h2>Reported Symptoms</h2>
  <p>{escape(str(symptoms))}</p>
  <h2>Health History</h2>
  {_html_list(history)}
  <h2>Community Context</h2>
  <p><strong>Condition family:</strong> {escape(str(community.get('condition', 'Unknown')))}</p>
  <p><strong>Trend:</strong> {escape(str(community.get('trend', 'Unknown')))}</p>
  <p><strong>Regional risk score:</strong> {escape(str(community.get('regional_risk_score', 'Unknown')))}</p>
  {_html_list(community.get('risk_factors', []))}
  <h2>Recommended Next Steps</h2>
  {_html_list(steps)}
  <h2>Recommended Tests</h2>
  {_html_list(tests)}
  <h2>Citations</h2>
  {_html_list([source.get('title') or source.get('citation') or source for source in citations])}
</body>
</html>
"""
    return {
        "title": title,
        "markdown": markdown,
        "html": html,
        "plain_text": markdown.replace("#", "").replace("*", ""),
    }


def write_briefing_files(briefing: JsonDict, output_dir: str | Path) -> JsonDict:
    """Write M365-friendly Markdown and HTML files and return their paths."""
    rendered = format_briefing_document(briefing)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    base_name = rendered["title"].lower().replace(" ", "-")
    markdown_path = output_path / f"{base_name}.md"
    html_path = output_path / f"{base_name}.html"
    markdown_path.write_text(rendered["markdown"], encoding="utf-8")
    html_path.write_text(rendered["html"], encoding="utf-8")
    return {
        "markdown_path": str(markdown_path),
        "html_path": str(html_path),
    }

