import React, { useState, useEffect } from 'react';
import { Sparkles, Map, MapPin, Calendar, Loader2, Key, ChevronRight, Plane, Coffee, Camera, Footprints, Moon, Heart } from 'lucide-react';
import { useItineraryGenerator } from './useItineraryGenerator';
import StopModal from './StopModal';

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  const { status, itinerary, errorMsg, generate } = useItineraryGenerator();

  useEffect(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiKey = (key) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('geminiApiKey', key);
    } else {
      localStorage.removeItem('geminiApiKey');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setUserInput(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      generate(userInput, apiKey);
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

  return (
    <div className="app-container">
      
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Plane size={24} color="white" />
          </div>
          <div className="logo-text">
            <h1 className="title-font">Wander<span>AI</span></h1>
            <p>Smart Itinerary Generator</p>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="form-card">
        <h2 className="title-font">Where do you want to go?</h2>
        <textarea
          className="main-textarea"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g. 3 days in Paris with a focus on art, history, and gastronomy..."
        />

        <div className="form-actions">
          <div className="preset-container">
            <span className="preset-label">Try a preset</span>
            <button type="button" onClick={() => handleSuggestionClick('3 days in Tokyo with a focus on modern tech and pop culture')} className="preset-btn preset-btn-blue">🗼 Tokyo Neon</button>
            <button type="button" onClick={() => handleSuggestionClick('3 days in Paris with a focus on art, history, and gastronomy')} className="preset-btn preset-btn-red">🥐 Paris Art</button>
            <button type="button" onClick={() => handleSuggestionClick('2 days in Rome')} className="preset-btn preset-btn-yellow">🏛️ Rome Classic</button>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? <Loader2 size={20} className="animate-spin-slow" /> : <Sparkles size={20} />}
            {status === 'loading' ? 'Generating itinerary...' : 'Generate Itinerary'}
          </button>
        </div>
      </form>

      {/* Error States */}
      {status === 'error' && errorMsg && (
        <div className="alert-card animate-fade-in">
          <span className="alert-title">Unable to generate itinerary</span>
          <span className="alert-desc">{errorMsg}</span>
        </div>
      )}

      {status === 'empty' && errorMsg && (
        <div className="alert-card warning animate-fade-in">
          <span className="alert-title">More info needed</span>
          <span className="alert-desc">{errorMsg}</span>
        </div>
      )}

      {/* Itinerary Results */}
      {status === 'success' && itinerary && (
        <div className="animate-fade-in">
          <div className="itinerary-header">
            <h2 className="title-font">{itinerary.trip_title}</h2>
            <div className="itinerary-meta">
              <span><MapPin size={18} /> {itinerary.destination}</span>
              <span><Calendar size={18} /> {itinerary.duration_days} Days</span>
            </div>
          </div>

          <div className="days-container">
            {itinerary.days.map((day, dIndex) => (
              <div 
                key={dIndex} 
                className="day-card animate-slide-up"
                style={{ animationDelay: `${dIndex * 0.15}s` }}
              >
                <div className="day-header">
                  <h3 className="title-font">Day {day.day}</h3>
                  <p>{day.title}</p>
                </div>

                <div className="stops-list">
                  {day.stops.map((stop, sIndex) => {
                    const theme = getCategoryTheme(stop.category);
                    return (
                      <div 
                        key={stop.id || sIndex} 
                        className={`stop-card ${theme.class}`}
                        onClick={() => setSelectedStop(stop)}
                      >
                        <div className="icon-container">
                          {theme.icon}
                        </div>
                        
                        <div className="stop-details">
                          <div className="stop-title-row">
                            <h4>{stop.name}</h4>
                            <span>{stop.time}</span>
                          </div>
                          <p className="stop-description">
                            {stop.notes}
                          </p>
                        </div>
                        
                        <div className="stop-chevron">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <Heart size={16} /> Made with WanderAI — Your smart travel companion.
      </footer>

      {/* Stop Detail Modal (Native Dialog) */}
      <StopModal stop={selectedStop} destination={itinerary?.destination} onClose={() => setSelectedStop(null)} />
    </div>
  );
}
