import { Activity, CalendarClock, ClipboardList, MapPin } from "lucide-react";
import type { ReactElement } from "react";
import type { TriageResult } from "./types";

interface SignalPanelProps {
  result: TriageResult | null;
}

const icons = [ClipboardList, CalendarClock, MapPin] as const;

export function SignalPanel({ result }: SignalPanelProps): ReactElement {
  return (
    <section className="panel signal-panel">
      <div className="panel-title">
        <Activity size={20} />
        <h2>Parallel IQ</h2>
      </div>
      {result ? (
        <div className="signal-list">
          {result.iq_summary.map((item, index) => {
            const Icon = icons[index] ?? Activity;
            return (
              <div className="signal-row" key={item.label}>
                <Icon size={18} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <b>{item.value}</b>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="signal-list idle">
          <div className="signal-row">
            <ClipboardList size={18} />
            <div>
              <strong>Foundry IQ</strong>
              <span>Medical source grounding</span>
            </div>
            <b>ready</b>
          </div>
          <div className="signal-row">
            <CalendarClock size={18} />
            <div>
              <strong>Work IQ</strong>
              <span>Patient context recall</span>
            </div>
            <b>ready</b>
          </div>
          <div className="signal-row">
            <MapPin size={18} />
            <div>
              <strong>Fabric IQ</strong>
              <span>Regional trend signal</span>
            </div>
            <b>ready</b>
          </div>
        </div>
      )}
    </section>
  );
}
