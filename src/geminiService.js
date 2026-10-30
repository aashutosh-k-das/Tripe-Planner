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

/**
 * Core callModel function requested by the user.
 * Communicates with the real Gemini API or falls back to a simulated database.
 */
export async function callModel(userInput, apiKey = null) {
  // If no apiKey is provided, use our premium mock generator database
  if (!apiKey) {
    // Simulate network latency (500ms)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if input is too vague
    const norm = userInput.trim().toLowerCase();
    if (norm.length < 5 || norm === "hello" || norm === "hi" || norm === "trip") {
      return JSON.stringify({
        error: "insufficient_detail",
        message: "Please tell us where you want to go (e.g. Tokyo, Paris) and what you want to do."
      });
    }

    const curated = findDestination(userInput);
    if (curated) {
      return JSON.stringify(buildItinerary(curated, parseRequestedDays(userInput)));
    }
    
    return generateGenericMock(userInput);
  }

  // If apiKey is provided, perform live call using the Google GenAI SDK
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `
You are a travel itinerary generator. You must respond with ONLY valid JSON — no markdown code fences, no commentary, no explanation before or after.

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
          "category": string,    // one of: "food", "sightseeing", "activity", "transport", "rest"
          "cost_estimate": string, // e.g. "$15", "Free", or "Varies"
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
- If the user's input is too vague to plan (e.g. no destination at all or just greetings), return:
  {"error": "insufficient_detail", "message": "<short explanation of what's missing>"}
- Do not invent placeholder fields not in the schema above.
- Keep "notes" concise — no more than 25 words.
`;

    // We call gemini-2.5-flash as it is highly efficient and recommended
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userInput,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    if (!response || !response.text) {
      throw new Error("No response text received from the Gemini API");
    }

    return response.text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}
