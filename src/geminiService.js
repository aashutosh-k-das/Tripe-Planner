import { GoogleGenerativeAI } from '@google/generative-ai';
import { findDestination, buildItinerary, parseRequestedDays } from './destinations';

/**
 * Fallback procedural generator if the user enters a custom city in mock mode
 */
function generateGenericMock(userInput) {
  // Regex to extract possible destination
  const matches = userInput.match(/(?:to|in|visit|explore|at)\s+([A-Z][a-zA-Z\s,]+)/i);
  let dest = "Unknown Destination";
  if (matches && matches[1]) {
    // Stop at phrases like "with a focus on..." or "for my honeymoon"
    dest = matches[1].split(/\s+(?:with|for|during|focus|focusing|on|and|in|to)\b/i)[0].trim().replace(/,$/, '');
    dest = dest.replace(/\b\w/g, (c) => c.toUpperCase());
  } else {
    // If we can't extract a destination, return insufficient detail
    return JSON.stringify({
      error: "insufficient_detail",
      message: "Please include a specific destination (e.g., 'London', 'New York') in your description."
    });
  }

  // Parse days (default 3)
  let daysCount = 3;
  const dayMatch = userInput.match(/(\d+)\s*day/i);
  if (dayMatch && dayMatch[1]) {
    daysCount = parseInt(dayMatch[1], 10);
  }
  
  if (daysCount <= 0 || daysCount > 10) {
    daysCount = 3;
  }

  const days = [];
  
  // A pool of varied day templates for the mock generator
  const mockTemplates = [
    {
      title: "Arrival & City Highlights",
      stops: [
        { name: `Historic Center of ${dest}`, cat: "sightseeing", notes: `Explore the most historical landmarks of ${dest} and learn about local culture.`, time: "10:00 AM", cost_estimate: "Free" },
        { name: "Local Cafe & Bistro", cat: "food", notes: "Taste local specialties and rest after a long morning of walking.", time: "12:30 PM", cost_estimate: "$15" },
        { name: "Central Plaza Walk", cat: "activity", notes: "Stroll through the main square, take photos, and do some light shopping.", time: "3:00 PM", cost_estimate: "Free" },
        { name: "Sunset Viewpoint", cat: "rest", notes: "A serene spot to relax and watch the sunset over the city skyline.", time: "6:00 PM", cost_estimate: "Free" }
      ]
    },
    {
      title: "Art, Museums & Culture",
      stops: [
        { name: "City National Museum", cat: "sightseeing", notes: "View renowned local artifacts, paintings, and historical exhibits.", time: "9:30 AM", cost_estimate: "$20" },
        { name: "Artisan Market & Street Food", cat: "food", notes: "Grab a quick and delicious bite from local vendors.", time: "1:00 PM", cost_estimate: "$10" },
        { name: "Guided Architecture Tour", cat: "activity", notes: "Learn about the unique building styles and hidden gems of the city.", time: "2:30 PM", cost_estimate: "$25" },
        { name: "River Walk or Canal Cruise", cat: "transport", notes: "Enjoy a peaceful ride or walk along the city's main waterway.", time: "5:00 PM", cost_estimate: "$15" }
      ]
    },
    {
      title: "Nature & Local Neighborhoods",
      stops: [
        { name: "Botanical Gardens", cat: "sightseeing", notes: "Spend the morning surrounded by lush exotic plants and serene pathways.", time: "9:00 AM", cost_estimate: "$10" },
        { name: "Bohemian Quarter Brunch", cat: "food", notes: "Enjoy trendy cafes and artisanal coffee in a vibrant local neighborhood.", time: "11:30 AM", cost_estimate: "$25" },
        { name: "Boutique Shopping", cat: "activity", notes: "Browse local independent shops and pick up unique souvenirs.", time: "2:00 PM", cost_estimate: "Varies" },
        { name: "Fine Dining Experience", cat: "food", notes: "Treat yourself to a premium dinner at one of the city's top-rated restaurants.", time: "7:00 PM", cost_estimate: "$80" }
      ]
    },
    {
      title: "Adventure & Entertainment",
      stops: [
        { name: "Morning Hike or Bike Ride", cat: "activity", notes: "Get active early with a scenic route around the city outskirts.", time: "8:00 AM", cost_estimate: "Free" },
        { name: "Local Brewery or Food Hall", cat: "food", notes: "Refuel with hearty food and local craft beverages.", time: "12:30 PM", cost_estimate: "$20" },
        { name: "Amusement or Theme Park", cat: "activity", notes: "Spend the afternoon enjoying thrilling rides and games.", time: "3:00 PM", cost_estimate: "$50" },
        { name: "Live Theater or Music Show", cat: "sightseeing", notes: "End the day with an unforgettable local performance.", time: "8:00 PM", cost_estimate: "$45" }
      ]
    }
  ];

  for (let i = 1; i <= daysCount; i++) {
    const templateIndex = (i - 1) % mockTemplates.length;
    const template = mockTemplates[templateIndex];
    
    days.push({
      day: i,
      title: template.title,
      stops: template.stops.map((stop, idx) => ({
        id: `d${i}-s${idx + 1}`,
        name: stop.name,
        time: stop.time,
        category: stop.cat,
        notes: stop.notes,
        cost_estimate: stop.cost_estimate
      }))
    });
  }

  return JSON.stringify({
    trip_title: `Discover ${dest}`,
    destination: dest,
    duration_days: daysCount,
    days: days
  });
}

// Optional: set VITE_GEMINI_API_KEY (and optionally VITE_GEMINI_MODEL) in a .env file to use live AI
const ENV_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = import.meta.env?.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
export const hasAIKey = Boolean(ENV_KEY);

const ITINERARY_INSTRUCTION = `
You are a travel itinerary generator for travellers based in India. You must respond with ONLY valid JSON — no markdown code fences, no commentary, no explanation before or after.

Given a free-form trip description from the user, generate a day-by-day itinerary matching this EXACT schema:

{
  "trip_title": string,
  "destination": string,
  "duration_days": number,
  "days": [
    {
      "day": number,
      "title": string,
      "stops": [
        {
          "id": string,          // short unique id, e.g. "d1-s1"
          "name": string,
          "time": string,        // e.g. "9:00 AM" or "Morning"
          "category": string,    // one of: "food", "sightseeing", "activity", "transport", "rest", "nature"
          "cost_estimate": string, // e.g. "₹500", "$15", "Free", or "Varies"
          "notes": string        // 1-2 sentences, practical tip or description
        }
      ]
    }
  ]
}

Rules:
- Output ONLY the JSON object. No \`\`\`json fences, no leading/trailing text.
- Every day must have at least 2 stops and at most 6.
- "duration_days" must equal the length of the "days" array.
- If the user doesn't specify a trip length, default to 3 days.
- Use real, well-known places only. Price stops in India in rupees (₹) using Indian-citizen ticket prices; use local currency elsewhere.
- "destination" should be "City, Country", e.g. "Jaipur, India".
- If the user's input is too vague to plan (e.g. no destination at all or just greetings), return:
  {"error": "insufficient_detail", "message": "<short explanation of what's missing>"}
- Do not invent placeholder fields not in the schema above.
- Keep "notes" concise — no more than 25 words.
`;

async function generateJSON(systemInstruction, prompt, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error('No response text received from the Gemini API');
  return text;
}

async function mockItinerary(userInput) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check if input is too vague
  const norm = userInput.trim().toLowerCase();
  if (norm.length < 5 || norm === "hello" || norm === "hi" || norm === "trip") {
    return JSON.stringify({
      error: "insufficient_detail",
      message: "Please tell us where you want to go (e.g. Goa, Manali) and what you want to do."
    });
  }

  const curated = findDestination(userInput);
  if (curated) {
    return JSON.stringify(buildItinerary(curated, parseRequestedDays(userInput)));
  }

  return generateGenericMock(userInput);
}

/**
 * Generates an itinerary with Gemini when an API key is configured,
 * otherwise (or if the API call fails) from the curated library.
 */
export async function callModel(userInput, apiKey = null) {
  const key = apiKey || ENV_KEY;
  if (!key) return mockItinerary(userInput);

  try {
    return await generateJSON(ITINERARY_INSTRUCTION, userInput, key);
  } catch (error) {
    // Quota exceeded, invalid key or network trouble: degrade gracefully
    console.warn("Gemini API call failed, using curated itineraries instead:", error);
    return mockItinerary(userInput);
  }
}

const ADVISOR_INSTRUCTION = `
You are a friendly, honest travel advisor for travellers based in India.
You will receive the traveller's preferences and a list of CANDIDATE destinations with facts
(match score, season fit, travel time, cost level, tags and warnings) computed by the app.

Respond with ONLY valid JSON in this exact schema:
{
  "verdict": string,               // 2-3 sentences addressed to the traveller: where to go and why
  "ranking": [string],             // the 3 best candidate ids, best first
  "why": { "<candidate id>": string } // one sentence (max 25 words) per ranked id
}

Rules:
- Only choose from the candidate ids given. Never suggest places that are not in the list.
- Base your reasoning on the facts provided; do not invent prices, schedules or events.
- Be honest: if a place is a poor fit for the month (bad weather, closures), say so.
- If the traveller compares specific places, clearly say which is better for them and why.
`;

/**
 * Asks Gemini to rank and explain the advisor's candidates.
 * Returns null when no key is configured or the call fails, so callers can keep the built-in result.
 */
export async function adviseWithAI(prefs, candidates) {
  if (!ENV_KEY || candidates.length === 0) return null;

  const prompt = JSON.stringify({
    traveller: prefs,
    candidates: candidates.map((c) => ({
      id: c.dest.id,
      name: `${c.dest.name}, ${c.dest.country}`,
      matchScore: c.score,
      season: c.facts.season,
      bestTime: c.info.bestTime,
      fastestTravel: c.facts.route?.hours ? `${c.facts.route.hours.toFixed(1)} h by ${c.facts.route.mode}` : 'nearby',
      costLevel: ['', 'budget', 'mid-range', 'expensive'][c.facts.cost],
      tags: c.profile.tags,
      warnings: c.warnings,
    })),
  });

  try {
    const data = JSON.parse((await generateJSON(ADVISOR_INSTRUCTION, prompt, ENV_KEY)).replace(/```json|```/g, '').trim());
    const ids = new Set(candidates.map((c) => c.dest.id));
    const ranking = (data.ranking || []).filter((id) => ids.has(id));
    if (!data.verdict || ranking.length === 0) return null;
    return { verdict: String(data.verdict), ranking, why: data.why || {} };
  } catch (error) {
    console.warn("Gemini advisor call failed, using built-in recommendations:", error);
    return null;
  }
}

const CHAT_INSTRUCTION = `
You are WanderAI's friendly travel assistant, chatting inside a trip-planning app made for travellers based in India.

Style:
- Be warm, concise and practical: at most about 120 words per reply.
- Use simple Markdown only: **bold** and "- " bullet lists. No headings, tables or links.
- Prices for India in rupees (₹). Travel times are approximate; tell people to check live schedules before booking.

Grounding:
- Prefer destinations from the CATALOG below and use its facts (best time, cost level, tags).
- You may answer general travel questions about other places, but never invent specific prices, train numbers or timetables.
- When you recommend catalog destinations the traveller could plan, add a marker [[plan:<id>]] at the very end for each (at most 3), using ids from the catalog.
`;

/**
 * Multi-turn chat with Gemini. history: [{ role: 'user' | 'bot', text }], oldest first.
 * Returns { text, planIds } or null when no key is configured or the call fails.
 */
export async function chatWithAI(history, message, context) {
  if (!ENV_KEY) return null;

  try {
    const genAI = new GoogleGenerativeAI(ENV_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: `${CHAT_INSTRUCTION}
Traveller's home city: ${context.origin}.
${context.currentTrip ? `They are currently viewing this trip: ${context.currentTrip}.` : ''}

CATALOG (id | name | best time | cost | tags | plan length):
${context.catalog}`,
    });

    // Gemini history must start with a user turn
    const turns = history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    while (turns.length && turns[0].role !== 'user') turns.shift();

    const chat = model.startChat({ history: turns });
    const result = await chat.sendMessage(message);
    const raw = result.response.text();
    if (!raw) return null;

    const planIds = [...raw.matchAll(/\[\[plan:([a-z0-9-]+)\]\]/g)].map((m) => m[1]);
    const text = raw.replace(/\[\[plan:[a-z0-9-]+\]\]/g, '').trim();
    return { text, planIds };
  } catch (error) {
    console.warn("Gemini chat failed, using the built-in assistant:", error);
    return null;
  }
}
