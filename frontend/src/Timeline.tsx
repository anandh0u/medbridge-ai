import { CalendarClock } from "lucide-react";
import type { ReactElement } from "react";
import type { TimelineEvent } from "./types";

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps): ReactElement {
  return (
    <section className="panel timeline-panel">
      <div className="panel-title">
        <CalendarClock size={20} />
        <h2>Work IQ Timeline</h2>
      </div>
      {events.length === 0 ? (
        <p className="muted">No recalled history yet.</p>
      ) : (
        <ol className="timeline-list">
          {events.map((event) => (
            <li key={`${event.date}-${event.summary}`}>
              <time dateTime={event.date}>{event.date}</time>
              <strong>{event.type ?? "Health event"}</strong>
              <span>{event.summary}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
