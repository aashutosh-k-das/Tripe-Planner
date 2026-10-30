import { useState, useEffect } from 'react';

// Fetches current conditions from Open-Meteo and maps the WMO weather code to a description
export async function fetchCurrentWeather(latitude, longitude) {
  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`);
  const weatherData = await weatherRes.json();
  if (!weatherData.current) return null;

  const temp = Math.round(weatherData.current.temperature_2m);
  const code = weatherData.current.weather_code;

  let description = 'Clear';
  let emoji = '☀️';

  if (code >= 1 && code <= 3) { description = 'Partly Cloudy'; emoji = '⛅'; }
  else if (code === 45 || code === 48) { description = 'Foggy'; emoji = '🌫️'; }
  else if (code >= 51 && code <= 67) { description = 'Rainy'; emoji = '🌧️'; }
  else if (code >= 71 && code <= 82) { description = 'Snowy'; emoji = '❄️'; }
  else if (code >= 95) { description = 'Thunderstorm'; emoji = '⛈️'; }

  return { temp, description, emoji };
}

// Pass known coordinates to skip geocoding (curated trips span several towns, e.g. "Delhi, Agra & Jaipur")
export function useWeather(destination, knownCoords = null) {
  const [weather, setWeather] = useState(null);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const lat = knownCoords?.[0];
  const lon = knownCoords?.[1];

  useEffect(() => {
    if (!destination) {
      setWeather(null);
      setPlace(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      try {
        let latitude = lat;
        let longitude = lon;
        let name = destination.split(/,|&/)[0].trim();
        let country = '';

        if (latitude == null) {
          // 1. Geocode the first place name to get lat/long using Open-Meteo's geocoding API
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
          const geoData = await geoRes.json();

          if (!geoData.results || geoData.results.length === 0) {
            setWeather(null);
            setPlace(null);
            return;
          }

          ({ latitude, longitude, name, country } = geoData.results[0]);
          setPlace({ coords: [latitude, longitude], countryCode: geoData.results[0].country_code });
        } else {
          setPlace(null);
        }

        // 2. Fetch the current weather for those coordinates
        const current = await fetchCurrentWeather(latitude, longitude);
        if (current) {
          setWeather({ ...current, location: country ? `${name}, ${country}` : name });
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeather(null);
        setPlace(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination, lat, lon]);

  return { weather, place, loading };
}
