import React from 'react';
import { Plane, TrainFront, Bus, Ship, Navigation, CalendarDays, ExternalLink, Zap, PiggyBank, LocateFixed } from 'lucide-react';
import { ORIGIN_CITIES, estimateRoutes, formatHours } from './travelInfo';

const MODE_META = {
  air: { icon: Plane, label: 'By Flight' },
  rail: { icon: TrainFront, label: 'By Train' },
  road: { icon: Bus, label: 'By Road' },
  sea: { icon: Ship, label: 'By Sea' },
};

function bookingLink(mode, origin, placeName, coords) {
  if (mode === 'air') {
    return { label: 'Search flights', url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${origin.name} to ${placeName}`)}` };
  }
  if (mode === 'rail') {
    return { label: 'Find trains on IRCTC', url: 'https://www.irctc.co.in/nget/train-search' };
  }
  if (mode === 'road') {
    const params = new URLSearchParams({ api: '1', origin: origin.name, destination: coords.join(','), travelmode: 'driving' });
    return { label: 'Get directions', url: `https://www.google.com/maps/dir/?${params}` };
  }
  return null;
}

export default function GettingThere({ info, placeName, originName, onOriginChange }) {
  const origin = ORIGIN_CITIES.find((city) => city.name === originName) || ORIGIN_CITIES[0];
  const { nearby, distance, modes } = estimateRoutes(origin, info);

  return (
    <section className="reach-card animate-slide-up">
      <div className="reach-header">
        <div>
          <span className="reach-eyebrow"><Navigation size={14} /> Getting there</span>
          <h3 className="reach-title">How to reach {placeName}</h3>
          {info.bestTime && (
            <span className="best-time"><CalendarDays size={14} /> Best time to visit: <strong>{info.bestTime}</strong></span>
          )}
        </div>

        <label className="origin-select">
          <span><LocateFixed size={14} /> Travelling from</span>
          <select value={origin.name} onChange={(e) => onOriginChange(e.target.value)}>
            {ORIGIN_CITIES.map((city) => (
              <option key={city.name} value={city.name}>{city.name}</option>
            ))}
          </select>
        </label>
      </div>

      {nearby ? (
        <div className="reach-nearby">
          📍 You’re already in {placeName}! Start exploring right away.
        </div>
      ) : (
        <>
          <div className="reach-modes">
            {modes.map((m) => {
              const { icon: Icon, label } = MODE_META[m.mode];
              const link = m.available ? bookingLink(m.mode, origin, placeName, info.coords) : null;
              return (
                <div
                  key={m.mode}
                  className={`reach-mode reach-${m.mode} ${m.available ? '' : 'unavailable'} ${m.fastest ? 'is-fastest' : ''}`}
                >
                  <div className="reach-mode-top">
                    <div className="reach-mode-icon"><Icon size={20} /></div>
                    <div className="reach-badges">
                      {m.fastest && <span className="reach-badge fastest"><Zap size={11} /> Fastest</span>}
                      {m.budget && <span className="reach-badge budget"><PiggyBank size={11} /> Budget pick</span>}
                    </div>
                  </div>

                  <div className="reach-mode-label">{label}</div>
                  {m.available ? (
                    m.hours != null ? (
                      <>
                        <div className="reach-time">~{formatHours(m.hours)}</div>
                        <div className="reach-breakdown">door to door · {m.breakdown}</div>
                      </>
                    ) : (
                      <div className="reach-time small">Multi-day voyage</div>
                    )
                  ) : (
                    <div className="reach-time unavailable-text">{m.reason}</div>
                  )}

                  {m.hub && <div className="reach-hub">{m.hub}</div>}
                  {m.note && <p className="reach-note">{m.note}</p>}

                  {link && (
                    <a className="reach-link" href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.label} <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="reach-disclaimer">
            Estimates for the ~{distance.toLocaleString()} km from {origin.name}, including check-in and transfers. Actual schedules vary, so check before booking.
            {info.inferred && ' Route details for this destination are estimated.'}
          </p>
        </>
      )}
    </section>
  );
}
