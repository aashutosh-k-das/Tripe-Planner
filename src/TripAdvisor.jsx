import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight, Minus, Plus, Check, AlertTriangle, Trophy, Scale } from 'lucide-react';
import { ORIGIN_CITIES, formatHours } from './travelInfo';
import { MONTHS, INTERESTS, GROUPS, BUDGETS, MODE_EMOJI, MODE_WORD, recommend, parseAdvisorQuery } from './advisor';
import { adviseWithAI, hasAIKey } from './geminiService';

const MEDALS = ['🥇', '🥈', '🥉'];
const SEASON_LABEL = { peak: 'Peak season', shoulder: 'Shoulder season', off: 'Off-season' };
const EXAMPLES = [
  'Goa or Kerala for a honeymoon in December?',
  'Is Ladakh good in January?',
  'Cheap mountain trip with friends in March',
  'Family beach holiday for 4 days from Bangalore',
];

function nextMonth() {
  return (new Date().getMonth() + 1) % 12 + 1;
}

export default function TripAdvisor({ originCity, onOriginChange, onPlanTrip }) {
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(nextMonth);
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(2);
  const [group, setGroup] = useState(null);
  const [interests, setInterests] = useState([]);
  const [includeAbroad, setIncludeAbroad] = useState(false);
  const [result, setResult] = useState(null);
  const [thinking, setThinking] = useState(false);

  const toggleInterest = (id) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const runAdvisor = async (text) => {
    // Free text fills in the form, so the traveller can see what was understood
    const parsed = text.trim() ? parseAdvisorQuery(text) : { mentioned: [] };
    const prefs = {
      origin: parsed.origin || originCity,
      month: parsed.month || month,
      days: parsed.days || days,
      budget: parsed.budget || budget,
      group: parsed.group || group,
      interests: parsed.interests ? [...new Set([...interests, ...parsed.interests])] : interests,
      includeAbroad: parsed.includeAbroad || includeAbroad,
      mentioned: parsed.mentioned,
    };
    if (parsed.origin) onOriginChange(parsed.origin);
    setMonth(prefs.month);
    setDays(prefs.days);
    setBudget(prefs.budget);
    setGroup(prefs.group);
    setInterests(prefs.interests);
    setIncludeAbroad(prefs.includeAbroad);

    setThinking(true);
    const base = recommend(prefs);
    let final = { ...base, prefs, poweredBy: 'engine', aiWhy: {} };

    if (hasAIKey) {
      // Compare questions only rank the places asked about
      const candidates = base.mode === 'compare' ? base.picks : [...base.picks, ...base.alsoConsider];
      const ai = await adviseWithAI(
        { ...prefs, month: MONTHS[prefs.month - 1], mentioned: prefs.mentioned.map((d) => d.name), question: text || undefined },
        candidates
      );
      if (ai) {
        const byId = new Map(candidates.map((c) => [c.dest.id, c]));
        const picks = ai.ranking.map((id) => byId.get(id)).slice(0, 3);
        final = {
          ...final,
          picks,
          alsoConsider: candidates.filter((c) => !picks.includes(c)).slice(0, 4),
          verdict: ai.verdict,
          aiWhy: ai.why,
          poweredBy: 'gemini',
        };
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 450));
    }

    setResult(final);
    setThinking(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runAdvisor(query);
  };

  const handleExample = (example) => {
    setQuery(example);
    runAdvisor(example);
  };

  return (
    <div className="advisor">
      <form className="search-card advisor-card" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <Sparkles size={20} className="search-input-icon" />
          <textarea
            className="main-textarea advisor-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
            }}
            placeholder="Ask anything, e.g. “Goa or Kerala for a honeymoon in December?”"
            rows={2}
          />
        </div>

        <div className="advisor-examples">
          {EXAMPLES.map((example) => (
            <button key={example} type="button" className="example-chip" onClick={() => handleExample(example)}>
              {example}
            </button>
          ))}
        </div>

        <div className="advisor-grid">
          <label className="advisor-field">
            <span>From</span>
            <select value={originCity} onChange={(e) => onOriginChange(e.target.value)}>
              {ORIGIN_CITIES.map((city) => <option key={city.name}>{city.name}</option>)}
            </select>
          </label>

          <label className="advisor-field">
            <span>When</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
          </label>

          <div className="advisor-field">
            <span>Days</span>
            <div className="stepper">
              <button type="button" onClick={() => setDays((d) => Math.max(1, d - 1))} aria-label="Fewer days"><Minus size={14} /></button>
              <strong>{days}</strong>
              <button type="button" onClick={() => setDays((d) => Math.min(10, d + 1))} aria-label="More days"><Plus size={14} /></button>
            </div>
          </div>

          <div className="advisor-field">
            <span>Budget</span>
            <div className="segmented">
              {BUDGETS.map((b) => (
                <button key={b.id} type="button" className={budget === b.id ? 'active' : ''} onClick={() => setBudget(b.id)} title={b.label}>
                  {b.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="advisor-field advisor-field-wide">
            <span>Travelling as</span>
            <div className="segmented">
              {GROUPS.map((g) => (
                <button key={g.id} type="button" className={group === g.id ? 'active' : ''} onClick={() => setGroup(group === g.id ? null : g.id)}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="advisor-interests">
          <span className="preset-label">I love</span>
          {INTERESTS.map((i) => (
            <button
              key={i.id}
              type="button"
              className={`interest-chip ${interests.includes(i.id) ? 'active' : ''}`}
              onClick={() => toggleInterest(i.id)}
              aria-pressed={interests.includes(i.id)}
            >
              {i.emoji} {i.label}
            </button>
          ))}
        </div>

        <div className="form-actions">
          <label className="switch">
            <input type="checkbox" checked={includeAbroad} onChange={(e) => setIncludeAbroad(e.target.checked)} />
            <span className="switch-track"><span className="switch-thumb" /></span>
            Include destinations abroad
          </label>
          <button type="submit" className="btn-primary" disabled={thinking}>
            {thinking ? <Loader2 size={20} className="animate-spin-slow" /> : <Sparkles size={20} />}
            {thinking ? 'Thinking…' : 'Find my perfect trip'}
          </button>
        </div>
      </form>

      {result && !thinking && <AdvisorResults result={result} onPlanTrip={onPlanTrip} />}
    </div>
  );
}

function AdvisorResults({ result, onPlanTrip }) {
  const { picks, alsoConsider, verdict, prefs, origin, mode, poweredBy, aiWhy } = result;
  const monthName = MONTHS[prefs.month - 1];
  const title = mode === 'compare' ? 'Which is better?' : mode === 'check' ? `Is ${picks[0]?.dest.name} a good idea?` : 'Your best matches';

  if (picks.length === 0) {
    return <div className="explore-empty">No destinations match those filters. Try including destinations abroad or changing the month.</div>;
  }

  // Highlight the best value in each comparison row
  const bestScore = Math.max(...picks.map((p) => p.score));
  const travelHours = picks.map((p) => p.facts.route?.hours ?? 0);
  const fastest = Math.min(...travelHours);
  const cheapest = Math.min(...picks.map((p) => p.facts.cost));

  return (
    <section className="advisor-results animate-fade-in" aria-live="polite">
      <div className="verdict-card">
        <div className="verdict-top">
          <span className="verdict-eyebrow">{mode === 'compare' ? <Scale size={14} /> : <Trophy size={14} />} {title}</span>
          <span className={`verdict-badge ${poweredBy}`}>
            {poweredBy === 'gemini' ? '✨ Gemini AI' : '🧭 Smart match'}
          </span>
        </div>
        <p className="verdict-text">{verdict}</p>
        {poweredBy === 'gemini' ? (
          <p className="verdict-hint">Ranked by Gemini AI. Match % comes from WanderAI’s season, budget and travel-time scoring.</p>
        ) : !hasAIKey && (
          <p className="verdict-hint">Ranked by the built-in engine. Add a Gemini API key to get AI-written advice.</p>
        )}
      </div>

      <div className="pick-grid">
        {picks.map((pick, i) => (
          <article
            key={pick.dest.id}
            className={`pick-card animate-slide-up ${i === 0 ? 'top-pick' : ''}`}
            style={{ '--dest-from': pick.dest.colors[0], '--dest-to': pick.dest.colors[1], animationDelay: `${i * 0.08}s` }}
          >
            <div className="pick-art">
              <span className="pick-medal">{MEDALS[i]}</span>
              <span className="destination-emoji">{pick.dest.emoji}</span>
              <span className="pick-score" style={{ '--score': pick.score }}>
                <strong>{pick.score}%</strong>
                <small>match</small>
              </span>
            </div>
            <div className="pick-body">
              <div className="destination-name">{pick.dest.name}</div>
              <div className="destination-country">{pick.dest.flag} {pick.dest.country}</div>
              {aiWhy[pick.dest.id] && <p className="pick-ai-why">“{aiWhy[pick.dest.id]}”</p>}

              <ul className="pick-reasons">
                {pick.reasons.slice(0, 4).map((reason) => (
                  <li key={reason}><Check size={14} /> {reason.replace(/^\S+\s/, '')}</li>
                ))}
              </ul>
              {pick.warnings.length > 0 && (
                <ul className="pick-warnings">
                  {pick.warnings.slice(0, 2).map((warning) => (
                    <li key={warning}><AlertTriangle size={13} /> {warning}</li>
                  ))}
                </ul>
              )}

              <button type="button" className="btn-plan" onClick={() => onPlanTrip(pick.dest, prefs.days)}>
                Plan this trip <ArrowRight size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {picks.length > 1 && (
        <div className="compare-wrap">
          <h4 className="compare-title"><Scale size={16} /> Side-by-side comparison</h4>
          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {picks.map((p) => <th key={p.dest.id}>{p.dest.emoji} {p.dest.name}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Match</td>
                  {picks.map((p) => <td key={p.dest.id} className={p.score === bestScore ? 'best' : ''}>{p.score}%</td>)}
                </tr>
                <tr>
                  <td>{monthName}</td>
                  {picks.map((p) => (
                    <td key={p.dest.id}><span className={`season-pill ${p.facts.season}`}>{SEASON_LABEL[p.facts.season]}</span></td>
                  ))}
                </tr>
                <tr>
                  <td>From {origin.name}</td>
                  {picks.map((p) => (
                    <td key={p.dest.id} className={(p.facts.route?.hours ?? 0) === fastest ? 'best' : ''}>
                      {p.facts.route?.hours != null ? `${MODE_EMOJI[p.facts.route.mode]} ~${formatHours(p.facts.route.hours)} by ${MODE_WORD[p.facts.route.mode]}` : 'You’re there'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Cost</td>
                  {picks.map((p) => (
                    <td key={p.dest.id} className={p.facts.cost === cheapest ? 'best' : ''}>
                      {BUDGETS[p.facts.cost - 1].symbol} <small>{BUDGETS[p.facts.cost - 1].label}</small>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Best for</td>
                  {picks.map((p) => (
                    <td key={p.dest.id}>
                      {p.profile.tags.map((t) => INTERESTS.find((i) => i.id === t)).filter(Boolean).slice(0, 3).map((i) => i.emoji + ' ' + i.label).join(', ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Ideal length</td>
                  {picks.map((p) => <td key={p.dest.id}>{p.facts.idealDays}+ days</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alsoConsider.length > 0 && (
        <div className="also-consider">
          <span className="preset-label">Also consider</span>
          {alsoConsider.map((r) => (
            <button key={r.dest.id} type="button" className="example-chip" onClick={() => onPlanTrip(r.dest, prefs.days)}>
              {r.dest.emoji} {r.dest.name} <small>{r.score}%</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
