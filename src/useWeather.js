import { useState, useEffect } from 'react';

export function useWeather(destination) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destination) {
      setWeather(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      try {
        // 1. Geocode the destination name to get lat/long using Open-Meteo's geocoding API
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          setWeather(null);
          return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Fetch the current weather for those coordinates
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`);
        const weatherData = await weatherRes.json();

        if (weatherData.current) {
          const temp = Math.round(weatherData.current.temperature_2m);
          const code = weatherData.current.weather_code;
          
          // Map WMO weather codes to simple descriptions and emojis
          let description = 'Clear';
          let emoji = '☀️';
          
          if (code >= 1 && code <= 3) { description = 'Partly Cloudy'; emoji = '⛅'; }
          else if (code === 45 || code === 48) { description = 'Foggy'; emoji = '🌫️'; }
          else if (code >= 51 && code <= 67) { description = 'Rainy'; emoji = '🌧️'; }
          else if (code >= 71 && code <= 82) { description = 'Snowy'; emoji = '❄️'; }
          else if (code >= 95) { description = 'Thunderstorm'; emoji = '⛈️'; }

          setWeather({
            temp,
            description,
            emoji,
            location: `${name}, ${country}`
          });
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeather(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination]);

  return { weather, loading };
}
