import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Map, MapPin, Calendar, Loader2, ChevronRight, Plane, Coffee, Camera, Footprints, Moon, Heart, Clock, Printer, History, Share2, Check, Wallet, CalendarPlus, Trash2, CheckCircle2, Compass, ArrowRight, AlertCircle, Wand2, Download, Search, Info, TrainFront, Bus, Ship } from 'lucide-react';
import { useItineraryGenerator } from './useItineraryGenerator';
import { useWeather } from './useWeather';
import { useTripHistory } from './useTripHistory';
import { stopKey, computeBudget, formatMoney, buildIcs, downloadFile } from './tripUtils';
import { DESTINATIONS, REGIONS, INDIA_AREAS, findDestination } from './destinations';
import { TRAVEL_INFO, ORIGIN_CITIES, inferTravelInfo, estimateRoutes, formatHours, detectOrigin } from './travelInfo';
import GettingThere from './GettingThere';
import StopModal from './StopModal';
import DailyMapModal from './DailyMapModal';

const CATEGORY_LABELS = {
  'cat-food': 'Food',
  'cat-attraction': 'Sightseeing',
  'cat-nature': 'Nature',
  'cat-transport': 'Transport',
  'cat-culture': 'Activities',
  'cat-rest': 'Rest',
  'cat-default': 'Other',
};

const PRESETS = [
  { emoji: '🕌', label: 'Golden Triangle', prompt: '4 days in India: Delhi, Agra and Jaipur', from: '#f97316', to: '#db2777' },
  { emoji: '🏖️', label: 'Goa', prompt: '3 days in Goa with beaches and forts', from: '#06b6d4', to: '#f59e0b' },
  { emoji: '🛶', label: 'Kerala', prompt: '3 days in Kerala with backwaters and tea hills', from: '#10b981', to: '#0ea5e9' },
  { emoji: '🚣', label: 'Kashmir', prompt: '3 days in Kashmir: Srinagar, Gulmarg and Pahalgam', from: '#38bdf8', to: '#16a34a' },
  { emoji: '🏔️', label: 'Ladakh', prompt: '3 days in Ladakh with monasteries and Pangong Lake', from: '#3b82f6', to: '#06b6d4' },
];

const FEATURES = [
  { icon: Compass, title: 'Describe your trip', text: 'Tell us where you want to go, for how long, and what you love — food, art, nature or nightlife.' },
  { icon: Wand2, title: 'AI builds the plan', text: 'Get a day-by-day timeline with timings, costs, live weather and the easiest way to get there by flight, train or road.' },
  { icon: Download, title: 'Take it with you', text: 'Track visited stops, export to your calendar, print a PDF or share it with your travel crew.' },
];

const MODE_ICONS = { air: Plane, rail: TrainFront, road: Bus, sea: Ship };
const MODE_LABELS = { air: 'flight', rail: 'train', road: 'road', sea: 'sea' };

function loadOrigin() {
  try {
    return localStorage.getItem('wanderai_origin') || ORIGIN_CITIES[0].name;
  } catch {
    return ORIGIN_CITIES[0].name;
  }
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedDayForMap, setSelectedDayForMap] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState(tomorrowISO);
  const [exploreRegion, setExploreRegion] = useState(REGIONS[0]);
  const [exploreQuery, setExploreQuery] = useState('');
  const [indiaArea, setIndiaArea] = useState('All');
  const [originCity, setOriginCity] = useState(loadOrigin);
  const historyMenuRef = useRef(null);

  const { status, itinerary, errorMsg, generate, setItinerary, setStatus } = useItineraryGenerator();

  // Curated trips carry their id; older saved trips are matched by name
  const curatedDest = itinerary
    ? DESTINATIONS.find((dest) => dest.id === itinerary.destination_id) || (!itinerary.destination_id && findDestination(itinerary.destination || '')) || null
    : null;
  const curatedTravel = curatedDest ? TRAVEL_INFO[curatedDest.id] : null;
  const { weather, place, loading: weatherLoading } = useWeather(itinerary?.destination, curatedTravel?.coords);
  const travelInfo = curatedTravel || (place ? inferTravelInfo(place.coords, place.countryCode) : null);
  const placeName = curatedDest ? curatedDest.name : (itinerary?.destination || '').split(',')[0];
  const { history, saveToHistory, removeFromHistory, clearHistory } = useTripHistory();

  const budget = useMemo(() => (itinerary ? computeBudget(itinerary) : null), [itinerary]);
  const visitedSet = useMemo(() => new Set(itinerary?.visitedStops || []), [itinerary]);
  const totalStops = itinerary ? itinerary.days.reduce((sum, day) => sum + day.stops.length, 0) : 0;

  // Save successful itinerary to history
  useEffect(() => {
    if (status === 'success' && itinerary) {
      saveToHistory(itinerary);
    }
  }, [status, itinerary, saveToHistory]);

  // Click outside to close history menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (historyMenuRef.current && !historyMenuRef.current.contains(event.target)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      const origin = detectOrigin(userInput);
      if (origin) handleOriginChange(origin);
      setCategoryFilter('all');
      generate(userInput, ''); // Removed apiKey since we removed the setup panel
    }
  };

  const handleOriginChange = (name) => {
    setOriginCity(name);
    try {
      localStorage.setItem('wanderai_origin', name);
    } catch {
      // Storage unavailable; the choice just won't persist
    }
  };

  const handleExploreDestination = (dest) => {
    const place = dest.name === dest.country ? dest.name : `${dest.name}, ${dest.country}`;
    const prompt = `${dest.days.length} days in ${place}`;
    setUserInput(prompt);
    setCategoryFilter('all');
    generate(prompt, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadPastTrip = (pastTrip) => {
    setItinerary(pastTrip);
    setStatus('success');
    setCategoryFilter('all');
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrip = (e, id) => {
    e.stopPropagation();
    removeFromHistory(id);
  };

  const handleClearHistory = () => {
    if (window.confirm('Delete all saved trips? This cannot be undone.')) {
      clearHistory();
    }
  };

  // Visited state lives on the itinerary so it's saved with the trip in history
  const toggleVisited = (e, key) => {
    e.stopPropagation();
    const visited = new Set(visitedSet);
    if (visited.has(key)) visited.delete(key);
    else visited.add(key);
    setItinerary({ ...itinerary, visitedStops: [...visited] });
  };

  const handleExportCalendar = () => {
    if (!itinerary || !startDate) return;
    const ics = buildIcs(itinerary, startDate);
    const filename = `${(itinerary.destination || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-itinerary.ics`;
    downloadFile(ics, filename, 'text/calendar;charset=utf-8');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!itinerary) return;

    let text = `✈️ WanderAI Itinerary: ${itinerary.trip_title}\n📍 Destination: ${itinerary.destination}\n📅 Duration: ${itinerary.duration_days} Days\n\n`;

    itinerary.days.forEach(day => {
      text += `\n--- Day ${day.day}: ${day.title} ---\n`;
      day.stops.forEach(stop => {
        text += `• ${stop.time} - ${stop.name} (${stop.cost_estimate || 'Varies'})\n  ${stop.notes}\n`;
      });
    });

    if (travelInfo) {
      const origin = ORIGIN_CITIES.find((city) => city.name === originCity) || ORIGIN_CITIES[0];
      const fastest = estimateRoutes(origin, travelInfo).modes.find((m) => m.fastest);
      if (fastest) {
        text += `\n🧭 Getting there from ${origin.name}: fastest by ${MODE_LABELS[fastest.mode]} (~${formatHours(fastest.hours)} door to door)\n`;
      }
    }

    if (budget && budget.total > 0) {
      text += `\n💰 Estimated budget: ~${formatMoney(budget.total, budget.symbol)} per person\n`;
    }

    text += `\n✨ Generated by WanderAI`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const getCategoryTheme = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return { class: 'cat-food', icon: <Coffee size={20} /> };
    if (cat.includes('sightseeing') || cat.includes('attraction') || cat.includes('landmark')) return { class: 'cat-attraction', icon: <Camera size={20} /> };
    if (cat.includes('park') || cat.includes('nature')) return { class: 'cat-nature', icon: <Map size={20} /> };
    if (cat.includes('transport') || cat.includes('flight') || cat.includes('train')) return { class: 'cat-transport', icon: <Plane size={20} /> };
    if (cat.includes('activity') || cat.includes('culture') || cat.includes('museum')) return { class: 'cat-culture', icon: <Footprints size={20} /> };
    if (cat.includes('rest') || cat.includes('hotel')) return { class: 'cat-rest', icon: <Moon size={20} /> };
    return { class: 'cat-default', icon: <MapPin size={20} /> };
  };

  // Categories present in this itinerary, in a stable order, for the filter chips
  const availableCategories = itinerary
    ? Object.keys(CATEGORY_LABELS).filter((cls) =>
        itinerary.days.some((day) => day.stops.some((stop) => getCategoryTheme(stop.category).class === cls))
      )
    : [];

  const isIdle = status !== 'success' && status !== 'loading';

  // Search spans every region; otherwise show the selected region tab
  const query = exploreQuery.trim().toLowerCase();
  const exploreResults = query
    ? DESTINATIONS.filter((dest) =>
        [dest.name, dest.country, dest.tagline, ...dest.keywords].some((text) => text.toLowerCase().includes(query))
      )
    : DESTINATIONS.filter((dest) =>
        dest.region === exploreRegion && (exploreRegion !== 'India' || indiaArea === 'All' || dest.area === indiaArea)
      );
  const indiaCount = DESTINATIONS.filter((dest) => dest.region === 'India').length;

  return (
    <div className="app-shell">
      <div className="bg-decor" aria-hidden="true">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="logo-container">
            <div className="logo-icon">
              <Plane size={20} color="white" />
            </div>
            <div className="logo-text">
              <h1>Wander<span>AI</span></h1>
              <p>Smart Itinerary Generator</p>
            </div>
          </div>

          {/* History Dropdown */}
          <div className="history-dropdown" ref={historyMenuRef}>
            <button
              className="btn-ghost"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
            >
              <History size={16} />
              My Trips
              {history.length > 0 && <span className="history-count">{history.length}</span>}
            </button>

            {showHistory && (
              <div className="history-menu animate-pop-in">
                <div className="history-menu-title">Saved trips</div>
                {history.length === 0 ? (
                  <div className="no-history">
                    <Compass size={28} />
                    <span>No trips yet. Generate one to see it here.</span>
                  </div>
                ) : (
                  <>
                    {history.map((trip) => (
                      <div key={trip.id} className="history-item" onClick={() => loadPastTrip(trip)}>
                        <div className="history-item-avatar">{(trip.destination || '?').charAt(0)}</div>
                        <div className="history-item-info">
                          <div className="history-item-title">{trip.trip_title || trip.destination}</div>
                          <div className="history-item-date">
                            {trip.duration_days} days • {new Date(trip.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="history-delete-btn"
                          onClick={(e) => handleDeleteTrip(e, trip.id)}
                          aria-label={`Delete ${trip.trip_title || trip.destination}`}
                          title="Delete trip"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="history-clear-btn" onClick={handleClearHistory}>
                      Clear all trips
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-container">
        {/* Hero + Search */}
        <section className="hero">
          <span className="hero-eyebrow"><Sparkles size={14} /> AI travel planner for India &amp; beyond</span>
          <h2 className="hero-title">
            Your next adventure,<br />
            <em>planned in seconds.</em>
          </h2>
          <p className="hero-subtitle">
            From Himalayan passes to Kerala’s backwaters, describe your dream trip in plain words. Get a day-by-day plan and the easiest way to get there by flight, train or road.
          </p>

          <form onSubmit={handleSubmit} className="search-card">
            <div className="search-input-wrap">
              <MapPin size={20} className="search-input-icon" />
              <textarea
                className="main-textarea"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
                }}
                placeholder="e.g. 3 days in Goa with beaches, forts and seafood..."
                rows={3}
              />
            </div>

            <div className="form-actions">
              <div className="preset-container">
                <span className="preset-label">Popular</span>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSuggestionClick(preset.prompt)}
                    className={`preset-btn ${userInput === preset.prompt ? 'active' : ''}`}
                    style={{ '--preset-from': preset.from, '--preset-to': preset.to }}
                  >
                    <span className="preset-emoji">{preset.emoji}</span>
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={status === 'loading' || !userInput.trim()}
              >
                {status === 'loading' ? <Loader2 size={20} className="animate-spin-slow" /> : <Sparkles size={20} />}
                {status === 'loading' ? 'Planning your trip...' : 'Generate Itinerary'}
                {status !== 'loading' && <ArrowRight size={18} className="btn-arrow" />}
              </button>
            </div>
          </form>
        </section>

        {/* Error States */}
        {status === 'error' && errorMsg && (
          <div className="alert-card animate-fade-in">
            <AlertCircle size={20} className="alert-icon" />
            <div>
              <span className="alert-title">Unable to generate itinerary</span>
              <span className="alert-desc">{errorMsg}</span>
            </div>
          </div>
        )}

        {status === 'empty' && errorMsg && (
          <div className="alert-card warning animate-fade-in">
            <AlertCircle size={20} className="alert-icon" />
            <div>
              <span className="alert-title">More info needed</span>
              <span className="alert-desc">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* How it works (before the first trip) */}
        {isIdle && (
          <section className="features-grid animate-fade-in">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="feature-card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon"><Icon size={22} /></div>
                <span className="feature-step">Step {i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </section>
        )}

        {/* Explore Destinations */}
        {isIdle && (
          <section className="explore animate-fade-in">
            <div className="explore-header">
              <div>
                <span className="explore-eyebrow"><Compass size={14} /> Explore</span>
                <h2 className="explore-title">Discover Incredible India</h2>
                <p className="explore-subtitle">{indiaCount} handpicked Indian trips, from Ladakh to the Andamans, plus {DESTINATIONS.length - indiaCount} more in Nepal, Asia and beyond. Each comes with flight, train and road routes.</p>
              </div>
              <div className="explore-search">
                <Search size={16} />
                <input
                  type="search"
                  value={exploreQuery}
                  onChange={(e) => setExploreQuery(e.target.value)}
                  placeholder="Search a city or country…"
                  aria-label="Search destinations"
                />
              </div>
            </div>

            {!query && (
              <div className="region-tabs" role="tablist">
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    role="tab"
                    aria-selected={exploreRegion === region}
                    className={`region-tab ${exploreRegion === region ? 'active' : ''}`}
                    onClick={() => setExploreRegion(region)}
                  >
                    {region}
                    <span className="region-count">{DESTINATIONS.filter((dest) => dest.region === region).length}</span>
                  </button>
                ))}
              </div>
            )}

            {!query && exploreRegion === 'India' && (
              <div className="area-chips">
                {['All', ...INDIA_AREAS].map((area) => (
                  <button
                    key={area}
                    type="button"
                    className={`area-chip ${indiaArea === area ? 'active' : ''}`}
                    onClick={() => setIndiaArea(area)}
                  >
                    {area === 'All' ? 'All India' : area}
                  </button>
                ))}
              </div>
            )}

            {exploreResults.length === 0 ? (
              <div className="explore-empty">
                No curated trip for “{exploreQuery}” yet. Type it in the box above and we’ll still build you a plan.
              </div>
            ) : (
              <div className="destination-grid">
                {exploreResults.map((dest, i) => (
                  <button
                    key={dest.id}
                    type="button"
                    className="destination-card animate-slide-up"
                    style={{ '--dest-from': dest.colors[0], '--dest-to': dest.colors[1], animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                    onClick={() => handleExploreDestination(dest)}
                  >
                    <div className="destination-art">
                      <span className="destination-emoji">{dest.emoji}</span>
                      <span className="destination-days">{dest.days.length} days</span>
                    </div>
                    <div className="destination-body">
                      <div className="destination-name">{dest.name}</div>
                      <div className="destination-country">{dest.flag} {dest.country}</div>
                      <p className="destination-tagline">{dest.tagline}</p>
                      <div className="destination-modes">
                        {['air', 'rail', 'road', 'sea'].filter((mode) => TRAVEL_INFO[dest.id]?.[mode]).map((mode) => {
                          const Icon = MODE_ICONS[mode];
                          return (
                            <span key={mode} className="destination-mode" title={`Reachable by ${MODE_LABELS[mode]}`}>
                              <Icon size={13} />
                            </span>
                          );
                        })}
                      </div>
                      <span className="destination-cta">Plan this trip <ArrowRight size={14} /></span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Loading skeleton */}
        {status === 'loading' && (
          <section className="loading-state animate-fade-in" aria-live="polite">
            <div className="loading-plane">
              <Plane size={28} />
            </div>
            <p className="loading-text">Crafting your perfect itinerary…</p>
            {[0, 1].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </section>
        )}

        {/* Itinerary Results */}
        {status === 'success' && itinerary && (
          <div className="animate-fade-in">
            {/* Trip Banner */}
            <section className="trip-banner animate-slide-up">
              <div className="trip-banner-content">
                <span className="trip-banner-eyebrow">Your itinerary</span>
                <h2 className="trip-banner-title">{itinerary.trip_title}</h2>
                <div className="trip-banner-meta">
                  <span><MapPin size={16} /> {itinerary.destination}</span>
                  <span><Calendar size={16} /> {itinerary.duration_days} Days</span>
                  <span><Footprints size={16} /> {totalStops} Stops</span>
                  {weatherLoading ? (
                    <span><Loader2 size={16} className="animate-spin-slow" /> Checking weather…</span>
                  ) : weather ? (
                    <span>{weather.emoji} {weather.temp}°C, {weather.description}</span>
                  ) : null}
                </div>
              </div>
              <Plane size={140} className="trip-banner-plane" aria-hidden="true" />
            </section>

            {itinerary.notice && (
              <div className="trip-notice animate-fade-in">
                <Info size={16} /> {itinerary.notice}
              </div>
            )}

            {/* Actions Toolbar */}
            <div className="itinerary-actions animate-slide-up">
              <button className="btn-outline" onClick={handlePrint}>
                <Printer size={16} /> Print PDF
              </button>

              <button className={`btn-outline ${copied ? 'success' : ''}`} onClick={handleShare}>
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                {copied ? 'Copied!' : 'Copy to Share'}
              </button>

              <div className="calendar-export">
                <label htmlFor="trip-start-date" className="sr-only">Trip start date</label>
                <input
                  id="trip-start-date"
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Trip start date"
                />
                <button className="btn-outline btn-accent" onClick={handleExportCalendar} disabled={!startDate}>
                  <CalendarPlus size={16} /> Add to Calendar
                </button>
              </div>
            </div>

            {/* Trip Summary: budget & progress */}
            <div className="trip-summary animate-slide-up">
              <div className="summary-stat">
                <div className="summary-icon summary-icon-budget"><Wallet size={20} /></div>
                <div>
                  <div className="summary-label">Estimated budget</div>
                  <div className="summary-value">
                    ~{formatMoney(budget.total, budget.symbol)}
                    <span className="summary-sub"> per person</span>
                  </div>
                  {budget.unknownCount > 0 && (
                    <div className="summary-note">+ {budget.unknownCount} stop{budget.unknownCount > 1 ? 's' : ''} with variable cost</div>
                  )}
                </div>
              </div>

              <div className="summary-stat">
                <div className="summary-icon summary-icon-progress"><CheckCircle2 size={20} /></div>
                <div className="summary-progress">
                  <div className="summary-label">Trip progress</div>
                  <div className="summary-value">
                    {visitedSet.size} / {totalStops}
                    <span className="summary-sub"> stops visited</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${totalStops ? (visitedSet.size / totalStops) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Getting there: flight / train / road */}
            {travelInfo && (
              <GettingThere
                info={travelInfo}
                placeName={placeName}
                originName={originCity}
                onOriginChange={handleOriginChange}
              />
            )}

            {/* Category Filter */}
            {availableCategories.length > 1 && (
              <div className="category-filter">
                <button
                  type="button"
                  className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                >
                  All
                </button>
                {availableCategories.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    className={`filter-chip ${cls} ${categoryFilter === cls ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cls)}
                  >
                    <span className="filter-dot" />
                    {CATEGORY_LABELS[cls]}
                  </button>
                ))}
              </div>
            )}

            <div className="days-container">
              {itinerary.days.map((day, dIndex) => {
                const dayKeys = day.stops.map((stop, sIndex) => stopKey(day, stop, sIndex));
                const visitedToday = dayKeys.filter((key) => visitedSet.has(key)).length;
                const visibleStops = day.stops
                  .map((stop, sIndex) => ({ stop, sIndex }))
                  .filter(({ stop }) => categoryFilter === 'all' || getCategoryTheme(stop.category).class === categoryFilter);

                return (
                <div
                  key={dIndex}
                  className="day-card animate-slide-up"
                  style={{ animationDelay: `${dIndex * 0.12}s` }}
                >
                  <div className="day-header">
                    <div className="day-badge">
                      <span>Day</span>
                      <strong>{String(day.day).padStart(2, '0')}</strong>
                    </div>
                    <div className="day-header-text">
                      <h3>{day.title}</h3>
                      <div className="day-meta">
                        {budget.perDay[dIndex] > 0 && (
                          <span className="day-meta-pill">
                            <Wallet size={12} /> ~{formatMoney(budget.perDay[dIndex], budget.symbol)}
                          </span>
                        )}
                        <span className={`day-meta-pill ${visitedToday === day.stops.length ? 'complete' : ''}`}>
                          <CheckCircle2 size={12} /> {visitedToday}/{day.stops.length} done
                        </span>
                      </div>
                    </div>
                    <button
                      className="route-map-btn"
                      onClick={() => setSelectedDayForMap(day)}
                    >
                      <Map size={16} /> <span>Route Map</span>
                    </button>
                  </div>

                  <div className="stops-list">
                    {visibleStops.length === 0 && (
                      <div className="no-stops">No {CATEGORY_LABELS[categoryFilter]?.toLowerCase()} stops on this day.</div>
                    )}
                    {visibleStops.map(({ stop, sIndex }) => {
                      const theme = getCategoryTheme(stop.category);
                      const key = dayKeys[sIndex];
                      const isVisited = visitedSet.has(key);
                      return (
                        <div key={stop.id || sIndex} className={`timeline-item ${theme.class} ${isVisited ? 'visited' : ''}`}>
                          <div className="timeline-time">{stop.time}</div>

                          <div className="timeline-node">
                            <button
                              type="button"
                              className={`visit-toggle ${isVisited ? 'checked' : ''}`}
                              onClick={(e) => toggleVisited(e, key)}
                              aria-pressed={isVisited}
                              aria-label={isVisited ? `Mark ${stop.name} as not visited` : `Mark ${stop.name} as visited`}
                              title={isVisited ? 'Visited' : 'Mark as visited'}
                            >
                              {isVisited && <Check size={14} strokeWidth={3} />}
                            </button>
                          </div>

                          <div className="stop-card" onClick={() => setSelectedStop(stop)}>
                            <div className="icon-container">
                              {theme.icon}
                            </div>

                            <div className="stop-details">
                              <div className="stop-title-row">
                                <h4>{stop.name}</h4>
                                <span className="stop-time"><Clock size={12} /> {stop.time}</span>
                              </div>
                              <p className="stop-description">
                                {stop.notes}
                              </p>
                            </div>

                            {stop.cost_estimate && (
                              <span className="cost-badge">{stop.cost_estimate}</span>
                            )}

                            <div className="stop-chevron">
                              <ChevronRight size={18} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="footer-brand"><Plane size={16} /> Wander<span>AI</span></span>
          <span className="footer-tagline">Made with <Heart size={14} className="footer-heart" /> for curious travellers</span>
        </div>
      </footer>

      {/* Stop Detail Modal (Native Dialog) */}
      <StopModal stop={selectedStop} destination={itinerary?.destination} onClose={() => setSelectedStop(null)} />

      {/* Daily Route Map Modal */}
      <DailyMapModal dayData={selectedDayForMap} destination={itinerary?.destination} onClose={() => setSelectedDayForMap(null)} />
    </div>
  );
}
