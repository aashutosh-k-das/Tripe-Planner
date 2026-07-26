import { useState, useEffect } from 'react';

export function useTripHistory() {
  const [history, setHistory] = useState([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wanderai_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }
  }, []);

  // Save to history when a new itinerary is successfully generated
  const saveToHistory = (itinerary) => {
    if (!itinerary || !itinerary.trip_title) return;
    
    setHistory((prev) => {
      // Don't save duplicates
      if (prev.some(trip => trip.id === itinerary.id)) return prev;

      const newHistory = [itinerary, ...prev].slice(0, 10); // Keep last 10 trips
      localStorage.setItem('wanderai_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem('wanderai_history');
    setHistory([]);
  };

  return { history, saveToHistory, clearHistory };
}
