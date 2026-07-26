import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock itineraries for showcase
const MOCK_ITINERARIES = {
  tokyo: {
    trip_title: "Futuristic Neon & Traditional Tokyo",
    destination: "Tokyo, Japan",
    duration_days: 3,
    days: [
      {
        day: 1,
        title: "Modern Tech & Pop Culture",
        stops: [
          {
            id: "d1-s1",
            name: "Ichiran Ramen Shinjuku",
            time: "11:30 AM",
            category: "food",
            cost_estimate: "$15",
            notes: "Classic tonkotsu ramen served in private solo booths. Order customization sheet via ticket machine."
          },
          {
            id: "d1-s2",
            name: "Akihabara Electric Town",
            time: "1:30 PM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Explore multi-level retro gaming stores, anime shops, and see the bright electric signs."
          },
          {
            id: "d1-s3",
            name: "teamLab Planets TOKYO",
            time: "4:00 PM",
            category: "activity",
            cost_estimate: "$30",
            notes: "An immersive body-on digital art museum. Book tickets weeks in advance and prepare to walk barefoot through water."
          },
          {
            id: "d1-s4",
            name: "Shibuya Crossing & Hachiko",
            time: "7:00 PM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Experience the world's busiest pedestrian crossing. View it from the second-floor glass windows of surrounding cafes."
          },
          {
            id: "d1-s5",
            name: "Shibuya Sky Observation Deck",
            time: "8:30 PM",
            category: "activity",
            cost_estimate: "$25",
            notes: "Stunning open-air rooftop observatory. Ideal for 360-degree panoramic views of Tokyo's neon skyline at night."
          }
        ]
      },
      {
        day: 2,
        title: "Tradition & Lush Gardens",
        stops: [
          {
            id: "d2-s1",
            name: "Senso-ji Temple",
            time: "9:00 AM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Tokyo's oldest and most iconic Buddhist temple in Asakusa. Arrive early to beat the crowds and browse Nakamise-dori shops."
          },
          {
            id: "d2-s2",
            name: "Kura Sushi Asakusa",
            time: "12:00 PM",
            category: "food",
            cost_estimate: "$20",
            notes: "Interactive revolving conveyor belt sushi with gamified capsule toys. Fun and affordable dining experience."
          },
          {
            id: "d2-s3",
            name: "Meiji Jingu Shrine",
            time: "2:00 PM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "A serene Shinto shrine dedicated to Emperor Meiji, nestled inside a dense forest in the heart of Harajuku."
          },
          {
            id: "d2-s4",
            name: "Yoyogi Park Rest",
            time: "4:30 PM",
            category: "rest",
            cost_estimate: "Free",
            notes: "Relax under the tall trees. Great spot for people-watching and taking a peaceful break after walking around Harajuku."
          },
          {
            id: "d2-s5",
            name: "Robot Restaurant Tribute & Izakaya",
            time: "7:00 PM",
            category: "food",
            cost_estimate: "$45",
            notes: "Dine on delicious yakitori and drinks in the narrow, lantern-lit alleys of Omoide Yokocho."
          }
        ]
      },
      {
        day: 3,
        title: "Scenic Views & Luxury Shopping",
        stops: [
          {
            id: "d3-s1",
            name: "Tsukiji Outer Market",
            time: "8:30 AM",
            category: "food",
            cost_estimate: "$25",
            notes: "Try fresh street food like tamagoyaki (sweet omelet), fresh oysters, and high-quality sushi rolls."
          },
          {
            id: "d3-s2",
            name: "Hamarikyu Gardens",
            time: "10:30 AM",
            category: "sightseeing",
            cost_estimate: "$3",
            notes: "Beautiful Edo-period garden featuring seawater ponds. Enjoy matcha tea at the wooden teahouse in the center."
          },
          {
            id: "d3-s3",
            name: "Sumida River Cruise",
            time: "1:00 PM",
            category: "transport",
            cost_estimate: "$15",
            notes: "Board a futuristic boat ride down the river to Odaiba. Offers unique views of Tokyo's architectural bridges."
          },
          {
            id: "d3-s4",
            name: "Odaiba Seaside Park",
            time: "3:00 PM",
            category: "activity",
            cost_estimate: "Free",
            notes: "Walk along the artificial beach, view the miniature Statue of Liberty, and shop at DiverCity Tokyo Plaza."
          },
          {
            id: "d3-s5",
            name: "Odaiba Onsen Monogatari Rest",
            time: "6:00 PM",
            category: "rest",
            cost_estimate: "$25",
            notes: "Relax your muscles in the hot spring pools and dress in traditional yukata robes."
          }
        ]
      }
    ]
  },
  paris: {
    trip_title: "Art, History & Gastronomy in Paris",
    destination: "Paris, France",
    duration_days: 3,
    days: [
      {
        day: 1,
        title: "Iconic Landmarks & Eiffel Views",
        stops: [
          {
            id: "d1-s1",
            name: "Careette Trocadéro",
            time: "9:00 AM",
            category: "food",
            cost_estimate: "$18",
            notes: "Enjoy their famous rich hot chocolate, buttery croissants, and colorful macarons with a view."
          },
          {
            id: "d1-s2",
            name: "Eiffel Tower",
            time: "10:30 AM",
            category: "sightseeing",
            cost_estimate: "$30",
            notes: "Ascend to the summit for breathtaking views. Book tickets online months in advance to skip lines."
          },
          {
            id: "d1-s3",
            name: "Champ de Mars Stroll",
            time: "1:00 PM",
            category: "rest",
            cost_estimate: "Free",
            notes: "Sit on the lawns for a mini picnic with cheese and baguettes. A perfect spot to rest your feet."
          },
          {
            id: "d1-s4",
            name: "Seine River Cruise",
            time: "3:00 PM",
            category: "transport",
            cost_estimate: "$20",
            notes: "Board a Bateaux Parisiens boat near the Eiffel Tower for a historic 1-hour cruise under Paris's beautiful bridges."
          },
          {
            id: "d1-s5",
            name: "Le Relais de l'Entrecôte",
            time: "7:30 PM",
            category: "food",
            cost_estimate: "$35",
            notes: "Famous for serving only one dish: steak frites with a secret herb sauce. Arrive early to queue."
          }
        ]
      },
      {
        day: 2,
        title: "Artistic Treasures & Historic Streets",
        stops: [
          {
            id: "d2-s1",
            name: "Louvre Museum",
            time: "9:00 AM",
            category: "sightseeing",
            cost_estimate: "$22",
            notes: "Enter via the glass pyramid. Prioritize seeing the Mona Lisa, Winged Victory, and Venus de Milo."
          },
          {
            id: "d2-s2",
            name: "Tuileries Garden",
            time: "12:30 PM",
            category: "rest",
            cost_estimate: "Free",
            notes: "Grab one of the iconic green metal chairs near the central fountains and relax under the trees."
          },
          {
            id: "d2-s3",
            name: "Musée de l'Orangerie",
            time: "2:00 PM",
            category: "activity",
            cost_estimate: "$15",
            notes: "View Claude Monet's massive Water Lilies murals in their custom-built curved white rooms."
          },
          {
            id: "d2-s4",
            name: "Champs-Élysées Walk",
            time: "4:00 PM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Walk up the famous avenue from Place de la Concorde to the Arc de Triomphe for shopping and sights."
          },
          {
            id: "d2-s5",
            name: "Le Comptoir de La Gastronomie",
            time: "7:30 PM",
            category: "food",
            cost_estimate: "$60",
            notes: "Classic Parisian bistro specializing in duck breast, foie gras, and escargot. Highly recommended to book."
          }
        ]
      },
      {
        day: 3,
        title: "Bohemian Montmartre & Latin Quarter",
        stops: [
          {
            id: "d3-s1",
            name: "Sacre-Coeur Basilica",
            time: "9:30 AM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Visit the stunning white basilica on top of the hill. Offers one of the best free panoramic views of Paris."
          },
          {
            id: "d3-s2",
            name: "Place du Tertre Artist Market",
            time: "11:00 AM",
            category: "activity",
            cost_estimate: "Free",
            notes: "Watch local street painters create portraits. Wander the cobbled alleys of Montmartre for vintage vibes."
          },
          {
            id: "d3-s3",
            name: "Pink Mamma Montmartre",
            time: "12:30 PM",
            category: "food",
            cost_estimate: "$35",
            notes: "A stunning 4-story Italian trattoria covered in ivy. Famous for truffle pasta and photo-worthy glass roof."
          },
          {
            id: "d3-s4",
            name: "Metro to Latin Quarter",
            time: "3:00 PM",
            category: "transport",
            cost_estimate: "$2",
            notes: "Take Paris Metro Line 4 down to Saint-Michel. A quick and classic way to travel like a local."
          },
          {
            id: "d3-s5",
            name: "Shakespeare and Company",
            time: "4:00 PM",
            category: "sightseeing",
            cost_estimate: "Free",
            notes: "Historic English-language bookstore near Notre Dame. Step inside to see the reading rooms and resident cat."
          }
        ]
      }
    ]
  }
};

/**
 * Normalizes input string to look up standard mock trips
 */
function findMockTrip(input) {
  const norm = input.toLowerCase();
  if (norm.includes("tokyo") || norm.includes("japan")) return MOCK_ITINERARIES.tokyo;
  if (norm.includes("paris") || norm.includes("france")) return MOCK_ITINERARIES.paris;
  return null;
}

/**
 * Fallback procedural generator if the user enters a custom city in mock mode
 */
function generateGenericMock(userInput) {
  // Regex to extract possible destination
  const matches = userInput.match(/(?:to|in|visit|explore|at)\s+([A-Z][a-zA-Z\s,]+)/i);
  let dest = "Unknown Destination";
  if (matches && matches[1]) {
    dest = matches[1].trim().split(" for")[0].split(" during")[0];
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
    trip_title: `Wonders of ${dest} Gateway`,
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

    const mock = findMockTrip(userInput);
    if (mock) {
      return JSON.stringify(mock);
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
