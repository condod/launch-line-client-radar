import type { ProspectRecord } from '../types';

type TerritoryMapProps = {
  prospects: ProspectRecord[];
  selectedLeadId: string;
  onSelectLead: (leadId: string) => void;
};

export function TerritoryMap({ prospects, selectedLeadId, onSelectLead }: TerritoryMapProps) {
  const mappedProspects = prospects.filter((lead) => Number.isFinite(lead.latitude) && Number.isFinite(lead.longitude));
  const latitudes = mappedProspects.map((lead) => lead.latitude as number);
  const longitudes = mappedProspects.map((lead) => lead.longitude as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  function pointFor(lead: ProspectRecord) {
    const lat = lead.latitude as number;
    const lng = lead.longitude as number;
    const lngRange = maxLng - minLng || 1;
    const latRange = maxLat - minLat || 1;
    return {
      x: 8 + ((lng - minLng) / lngRange) * 84,
      y: 8 + (1 - (lat - minLat) / latRange) * 84
    };
  }

  if (!mappedProspects.length) {
    return (
      <section className="panel map-panel territory-map empty-map">
        <div>
          <p className="eyebrow">Territory Map</p>
          <h2>No coordinates available</h2>
          <p>Import Google Places results or add latitude and longitude to plot leads.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel territory-map">
      <div className="section-heading">
        <p className="eyebrow">Territory Map</p>
        <h2>Local lead density</h2>
      </div>
      <div className="map-canvas" aria-label="Prospect territory plot">
        <svg aria-hidden="true" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="mapGrid" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#eaf6ff" />
              <stop offset="100%" stopColor="#f8fcff" />
            </linearGradient>
          </defs>
          <rect fill="url(#mapGrid)" height="100" rx="5" width="100" />
          {[20, 40, 60, 80].map((line) => (
            <g key={line} stroke="#cfe0f1" strokeWidth="0.35">
              <line x1={line} x2={line} y1="0" y2="100" />
              <line x1="0" x2="100" y1={line} y2={line} />
            </g>
          ))}
          <path d="M9 70 C22 62 30 78 43 66 C56 54 63 60 75 48 C84 38 89 32 93 24" fill="none" stroke="#37c9ff" strokeLinecap="round" strokeWidth="1.4" />
        </svg>
        {mappedProspects.map((lead) => {
          const point = pointFor(lead);
          const hot = lead.scores.priority_score >= 85;
          return (
            <button
              aria-label={`Open ${lead.business_name}`}
              className={lead.place_id === selectedLeadId ? 'map-pin active' : hot ? 'map-pin hot' : 'map-pin'}
              key={lead.place_id}
              onClick={() => onSelectLead(lead.place_id)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={`${lead.business_name}: ${lead.scores.priority_score}`}
              type="button"
            >
              <span>{lead.scores.priority_score}</span>
            </button>
          );
        })}
      </div>
      <div className="map-legend">
        <span><i className="legend-dot hot" />85+ hot</span>
        <span><i className="legend-dot" />Below 85</span>
        <span>{mappedProspects.length} plotted leads</span>
      </div>
    </section>
  );
}
