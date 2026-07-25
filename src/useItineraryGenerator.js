import { useState, useRef, useCallback } from 'react';
import { callModel } from './geminiService';

export function useItineraryGenerator() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error | empty
  const [itinerary, setItinerary] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const requestIdRef = useRef(0);

  const generate = useCallback(async (userInput, apiKey = null) => {
    const thisRequestId = ++requestIdRef.current; // bump on every call
    setStatus('loading');
    setErrorMsg('');

    try {
      const raw = await callModel(userInput, apiKey);

      // Ignore this response if a newer request has since been fired
      if (thisRequestId !== requestIdRef.current) return;

      const cleaned = raw.replace(/```json|```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleaned);
      } catch {
        setStatus('error');
        setErrorMsg('The AI returned something unreadable. Please try again.');
        return;
      }

      if (data.error === 'insufficient_detail') {
        setStatus('empty');
        setErrorMsg(data.message);
        return;
      }

      if (!Array.isArray(data.days) || data.days.length === 0) {
        setStatus('error');
        setErrorMsg('The itinerary came back in an unexpected format. Please try again.');
        return;
      }

      setItinerary(data);
      setStatus('success');
    } catch (e) {
      if (thisRequestId !== requestIdRef.current) return; // stale error, ignore
      setStatus('error');
      setErrorMsg(e.message || 'Something went wrong reaching the AI. Please try again.');
    }
  }, []);

  return { status, itinerary, errorMsg, generate };
}
