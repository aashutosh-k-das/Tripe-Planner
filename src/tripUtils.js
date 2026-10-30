// Stable key for a stop, even when the AI omits the id
export function stopKey(day, stop, index) {
  return stop.id ? `${day.day}:${stop.id}` : `${day.day}:s${index}`;
}

/**
 * Parses cost strings like "$15", "€20-30", "Free" or "Varies".
 * Ranges are averaged. Returns null when the cost can't be determined.
 */
export function parseCost(costStr) {
  if (!costStr) return null;
  const str = String(costStr).trim();
  if (/free/i.test(str)) return { amount: 0, symbol: '' };

  const numbers = str.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
  if (!numbers) return null;

  const values = numbers.slice(0, 2).map(Number);
  const amount = values.reduce((a, b) => a + b, 0) / values.length;
  const symbolMatch = str.match(/NPR|CHF|AED|Rs\.?|[$€£¥₹฿₩]/);
  return { amount, symbol: symbolMatch ? symbolMatch[0] : '' };
}

export function computeBudget(itinerary) {
  let symbol = '';
  let unknownCount = 0;

  const perDay = itinerary.days.map((day) => {
    let total = 0;
    day.stops.forEach((stop) => {
      const cost = parseCost(stop.cost_estimate);
      if (!cost) {
        unknownCount++;
        return;
      }
      total += cost.amount;
      if (!symbol && cost.symbol) symbol = cost.symbol;
    });
    return total;
  });

  const total = perDay.reduce((a, b) => a + b, 0);
  return { perDay, total, symbol: symbol || '$', unknownCount };
}

export function formatMoney(amount, symbol = '$') {
  // Letter codes like "NPR" or "CHF" read better with a space
  const separator = /[A-Za-z.]$/.test(symbol) ? ' ' : '';
  return `${symbol}${separator}${Math.round(amount).toLocaleString()}`;
}

// --- Calendar (.ics) export ---

const VAGUE_TIMES = { morning: 9, noon: 12, afternoon: 14, evening: 18, night: 20 };

// Returns minutes since midnight, or null if the time can't be read
function parseTime(timeStr) {
  if (!timeStr) return null;
  const str = timeStr.toLowerCase();

  const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (match[3] === 'pm' && hours < 12) hours += 12;
    if (match[3] === 'am' && hours === 12) hours = 0;
    if (hours < 24 && minutes < 60) return hours * 60 + minutes;
  }

  for (const [word, hour] of Object.entries(VAGUE_TIMES)) {
    if (str.includes(word)) return hour * 60;
  }
  return null;
}

function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatIcsDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/**
 * Builds an iCalendar file with one event per stop.
 * startDate is a "YYYY-MM-DD" string for Day 1. Times are floating (local to the traveller).
 */
export function buildIcs(itinerary, startDate) {
  const [year, month, dayOfMonth] = startDate.split('-').map(Number);
  const stamp = formatIcsDate(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WanderAI//Itinerary//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcs(itinerary.trip_title)}`,
  ];

  itinerary.days.forEach((day, dIndex) => {
    // Resolve start times, falling back to 2-hour slots from 9 AM
    const starts = day.stops.map((stop, i) => parseTime(stop.time) ?? 9 * 60 + i * 120);

    day.stops.forEach((stop, sIndex) => {
      const startMin = starts[sIndex];
      const nextMin = starts[sIndex + 1];
      const duration = nextMin > startMin ? Math.min(nextMin - startMin, 180) : 90;

      const start = new Date(year, month - 1, dayOfMonth + dIndex, 0, startMin);
      const end = new Date(start.getTime() + duration * 60000);
      const description = [stop.notes, stop.cost_estimate && `Est. cost: ${stop.cost_estimate}`]
        .filter(Boolean)
        .join('\n');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${itinerary.id || 'trip'}-d${day.day}-s${sIndex}@wanderai`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:${escapeIcs(stop.name)}`,
        `LOCATION:${escapeIcs(`${stop.name}, ${itinerary.destination}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        `CATEGORIES:${escapeIcs(stop.category || 'Trip')}`,
        'END:VEVENT'
      );
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
