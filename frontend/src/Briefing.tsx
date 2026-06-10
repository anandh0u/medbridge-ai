import { ClipboardList, ExternalLink, FileText, MapPin } from "lucide-react";
import type { ReactElement } from "react";
import type { CommunityContext, DoctorBriefing, TriageResult } from "./types";

interface BriefingProps {
  result: TriageResult | null;
}

function CommunityPanel({ context }: { context: CommunityContext }): ReactElement {
  return (
    <section className="panel community-panel">
      <div className="panel-title">
        <MapPin size={20} />
        <h2>Fabric IQ</h2>
      </div>
      <div className="metric-grid">
        <div>
          <span>Trend</span>
          <strong>{context.trend}</strong>
        </div>
        <div>
          <span>Regional risk</span>
          <strong>{Math.round(context.regional_risk_score * 100)}%</strong>
        </div>
      </div>
      <ul className="compact-list">
        {context.risk_factors.map((factor) => (
          <li key={factor}>{factor}</li>
        ))}
      </ul>
    </section>
  );
}

function DoctorBriefingPanel({ briefing }: { briefing: DoctorBriefing }): ReactElement {
  return (
    <section className="panel briefing-panel">
      <div className="panel-title">
        <FileText size={20} />
        <h2>Doctor Briefing</h2>
      </div>
      <dl className="briefing-summary">
        <div>
          <dt>Patient</dt>
          <dd>{briefing.patient_summary.patient_id}</dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>{briefing.patient_summary.region}</dd>
        </div>
        <div>
          <dt>Symptoms</dt>
          <dd>{briefing.reported_symptoms}</dd>
        </div>
      </dl>
      <div className="briefing-columns">
        <div>
          <h3>Recommended next steps</h3>
          <ul className="compact-list">
            {briefing.recommended_next_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Recommended tests</h3>
          <ul className="compact-list">
            {briefing.recommended_tests.map((test) => (
              <li key={test}>{test}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Briefing({ result }: BriefingProps): ReactElement {
  if (!result) {
    return (
      <section className="panel briefing-empty">
        <div className="panel-title">
          <ClipboardList size={20} />
          <h2>Briefing</h2>
        </div>
        <p className="muted">Run triage to generate the M365-ready report.</p>
      </section>
    );
  }

  return (
    <>
      <CommunityPanel context={result.community_context} />
      <DoctorBriefingPanel briefing={result.doctor_briefing} />
      <section className="panel citations-panel">
        <div className="panel-title">
          <ClipboardList size={20} />
          <h2>Citations</h2>
        </div>
        <ul className="citation-list">
          {result.citations.map((citation) => (
            <li key={citation.url ?? citation.citation}>
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer">
                  <span>{citation.title ?? citation.citation ?? citation.url}</span>
                  <ExternalLink size={16} />
                </a>
              ) : (
                <span>{citation.title ?? citation.citation}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="disclaimer">{result.disclaimer}</p>
      </section>
    </>
  );
}
