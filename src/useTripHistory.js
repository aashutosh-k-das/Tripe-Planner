import { useState, useCallback } from 'react';

const STORAGE_KEY = 'wanderai_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
}

function persist(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

export function useTripHistory() {
  // Load history from localStorage on first render
  const [history, setHistory] = useState(loadHistory);

  // Save a new itinerary, or update it in place if it already exists (e.g. visited stops changed)
  const saveToHistory = useCallback((itinerary) => {
    if (!itinerary || !itinerary.trip_title) return;

    setHistory((prev) => {
      const index = prev.findIndex(trip => trip.id === itinerary.id);
      if (index !== -1 && prev[index] === itinerary) return prev;

      const newHistory = index !== -1
        ? prev.map((trip, i) => (i === index ? itinerary : trip))
        : [itinerary, ...prev].slice(0, 10); // Keep last 10 trips
      persist(newHistory);
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((id) => {
    setHistory((prev) => {
      const newHistory = prev.filter(trip => trip.id !== id);
      persist(newHistory);
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, saveToHistory, removeFromHistory, clearHistory };
}
