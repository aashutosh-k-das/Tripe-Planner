// Offline travel assistant: answers common questions from WanderAI's own data
// (destinations, routes, seasons, budgets). Used when no Gemini key is set, or as a fallback.

import { DESTINATIONS, buildItinerary } from './destinations';
import { TRAVEL_INFO, ORIGIN_CITIES, estimateRoutes, formatHours, detectOrigin } from './travelInfo';
import { MONTHS, BUDGETS, INTERESTS, PROFILES, recommend, parseAdvisorQuery, findMentionedDestinations } from './advisor';
import { computeBudget, formatMoney } from './tripUtils';
import { fetchCurrentWeather } from './useWeather';

export const WELCOME_SUGGESTIONS = [
  'Where should I go in December?',
  'Goa or Kerala for a honeymoon?',
  'How to reach Manali from Delhi?',
  'What should I pack for Ladakh?',
];

const MODE_LINES = { air: '✈️ **Flight**', rail: '🚆 **Train**', road: '🚌 **Road**', sea: '⛴️ **Sea**' };
const shortMonths = (months) => months.map((m) => MONTHS[m - 1].slice(0, 3)).join(', ');
const costLabel = (level) => `${BUDGETS[level - 1].label.toLowerCase()} (${BUDGETS[level - 1].symbol})`;
const nextMonth = () => (new Date().getMonth() + 1) % 12 + 1;

const INTENTS = {
  greeting: /^(hi|hii+|hello|hey|namaste|hola|good (morning|afternoon|evening))\b/,
  help: /\b(help|what can you do|how does this work|who are you)\b/,
  thanks: /\b(thanks|thank you|thx|great|awesome|perfect)\b/,
  reach: /\b(how (to|do i|can i|should i) (reach|get|go|travel)|reach|get there|getting there|train|trains|flight|flights|fly|bus|by road|by rail|drive|distance)\b/,
  bestTime: /\b(best time|when (to|should i|can i) (visit|go)|which month|what month|season)\b/,
  weather: /\b(weather|temperature|raining|forecast)\b/,
  cost: /\b(cost|costs|budget|price|prices|expensive|how much|money|spend)\b/,
  pack: /\b(pack|packing|carry|clothes|wear|luggage|bring)\b/,
  plan: /\b(plan|itinerary|schedule|make (me )?a trip|create (a )?trip|book)\b/,
  check: /\b(is .+ (good|worth|ok|okay|safe|nice|fine|a good idea)|should i (go|visit)|worth (it|visiting))\b/,
  about: /\b(tell me about|about|what to do|things to do|what is there|highlights|famous for|what to see|places to visit)\b/,
  recommend: /\b(where|suggest|recommend|which place|destination|holiday|vacation|getaway|weekend|honeymoon|go in|trip)\b/,
};

function reachReply(dest, origin) {
  const info = TRAVEL_INFO[dest.id];
  const routes = estimateRoutes(origin, info);
  if (routes.nearby) {
    return `You’re already in **${dest.name}**! 📍 Want me to plan a trip around the city?`;
  }
  const lines = routes.modes.map((m) => {
    const label = MODE_LINES[m.mode];
    if (!m.available) return `${label}: ${m.reason}`;
    const time = m.hours != null ? `~${formatHours(m.hours)} door to door` : 'multi-day voyage';
    const badges = [m.fastest && '⚡ fastest', m.budget && '💰 budget pick'].filter(Boolean).join(', ');
    return `${label}: ${time}${badges ? ` (${badges})` : ''}${m.hub ? `, via ${m.hub}` : ''}`;
  });
  return [
    `Getting to **${dest.name}** from **${origin.name}** (~${routes.distance.toLocaleString()} km):`,
    ...lines.map((l) => `- ${l}`),
    '',
    `Best time to visit: **${info.bestTime}**. Times are estimates, so check live schedules before booking.`,
  ].join('\n');
}

function bestTimeReply(dest) {
  const info = TRAVEL_INFO[dest.id];
  const profile = PROFILES[dest.id];
  const lines = [`The best time to visit **${dest.name}** is **${info.bestTime}**.`];
  if (profile?.cautions.length) {
    lines.push('', 'Keep in mind:');
    profile.cautions.forEach((c) => lines.push(`- **${shortMonths(c.months)}**: ${c.text}`));
  }
  return lines.join('\n');
}

async function weatherReply(dest) {
  const info = TRAVEL_INFO[dest.id];
  try {
    const weather = await fetchCurrentWeather(info.coords[0], info.coords[1]);
    if (!weather) throw new Error('No data');
    return `Right now in **${dest.name}**: ${weather.emoji} **${weather.temp}°C**, ${weather.description.toLowerCase()}.\n\nBest time to visit: ${info.bestTime}.`;
  } catch {
    return `I couldn’t fetch live weather for ${dest.name} right now. The best time to visit is **${info.bestTime}**.`;
  }
}

function costReply(dest) {
  const itinerary = buildItinerary(dest);
  const budget = computeBudget(itinerary);
  const profile = PROFILES[dest.id];
  return [
    `For my ${itinerary.duration_days}-day **${dest.name}** plan, tickets, activities and food come to about **${formatMoney(budget.total, budget.symbol)} per person**${budget.unknownCount ? ` (plus ${budget.unknownCount} stop${budget.unknownCount > 1 ? 's' : ''} with variable cost)` : ''}.`,
    '',
    `That excludes hotels and getting there. Overall, ${dest.name} is a **${costLabel(profile.cost)}** destination.`,
  ].join('\n');
}

function packReply(dest, month) {
  const profile = PROFILES[dest.id];
  const info = TRAVEL_INFO[dest.id];
  const tags = profile.tags;
  const activeCautions = profile.cautions.filter((c) => c.months.includes(month)).map((c) => c.text.toLowerCase());
  const items = ['ID proof, phone charger & power bank, basic medicines'];

  if (dest.id === 'ladakh' || activeCautions.some((c) => c.includes('cold') || c.includes('snow')) || (tags.includes('snow') && [11, 12, 1, 2, 3].includes(month))) {
    items.push('Thermals, a down jacket, gloves, woollen cap and warm socks');
  } else if (tags.includes('mountains')) {
    items.push('Warm layers for chilly evenings and a light jacket');
  }
  if (dest.id === 'ladakh') items.push('SPF 50 sunscreen, lip balm and sunglasses; ask a doctor about altitude-sickness medicine');
  if (tags.includes('beach')) items.push('Swimwear, sunscreen, sunglasses, a hat and flip-flops');
  if (activeCautions.some((c) => c.includes('monsoon') || c.includes('rain'))) items.push('A rain jacket or umbrella, quick-dry clothes and waterproof footwear');
  if (activeCautions.some((c) => c.includes('heat') || c.includes('hot'))) items.push('Light cotton clothes, a hat and a refillable water bottle');
  if (tags.includes('spiritual') || tags.includes('heritage')) items.push('Modest clothes covering shoulders and knees, plus slip-on shoes for temples');
  if (tags.includes('adventure') || tags.includes('mountains')) items.push('Comfortable walking or trekking shoes');
  if (info.international) {
    items.push(dest.id === 'nepal' || dest.id === 'bhutan'
      ? 'Passport or voter ID (enough for Indian citizens)'
      : 'Passport, visa and travel insurance');
  }

  return [`Packing list for **${dest.name}** in **${MONTHS[month - 1]}**:`, ...items.map((i) => `- ${i}`)].join('\n');
}

function aboutReply(dest) {
  const info = TRAVEL_INFO[dest.id];
  const profile = PROFILES[dest.id];
  const highlights = dest.days.flatMap((day) => day.stops.slice(0, 2).map((stop) => stop[1])).slice(0, 5);
  const loves = profile.tags.map((t) => INTERESTS.find((i) => i.id === t)).filter(Boolean).slice(0, 4).map((i) => `${i.emoji} ${i.label}`);
  return [
    `**${dest.name}** ${dest.flag}: ${dest.tagline}.`,
    '',
    'Highlights:',
    ...highlights.map((h) => `- ${h}`),
    '',
    `Great for ${loves.join(', ')}. Best time: **${info.bestTime}**. Cost: ${costLabel(profile.cost)}. My plan covers **${dest.days.length} days**.`,
  ].join('\n');
}

// "Cheaper places than Goa": similar interests, lower cost level
function cheaperReply(dest, origin) {
  const profile = PROFILES[dest.id];
  const interests = profile.tags.filter((t) => INTERESTS.some((i) => i.id === t));
  const result = recommend({
    origin: origin.name,
    month: nextMonth(),
    days: dest.days.length,
    budget: Math.max(1, profile.cost - 1),
    group: null,
    interests,
    includeAbroad: dest.region !== 'India',
  });
  const picks = [...result.picks, ...result.alsoConsider]
    .filter((r) => r.dest.id !== dest.id && r.facts.cost < profile.cost)
    .slice(0, 3);
  if (picks.length === 0) {
    return { text: `${dest.name} is already one of the most affordable options for that kind of trip! 💰`, lastDestId: dest.id };
  }
  return {
    text: [
      `Places with a similar vibe to **${dest.name}**, but lighter on the wallet:`,
      ...picks.map((p) => `- **${p.dest.name}**: ${costLabel(p.facts.cost)}, ${p.score}% match for ${MONTHS[nextMonth() - 1]}`),
    ].join('\n'),
    actions: picks.map((p) => ({ type: 'plan', destId: p.dest.id })),
    lastDestId: picks[0].dest.id,
  };
}

function recommendReply(text, context) {
  const parsed = parseAdvisorQuery(text);
  const prefs = {
    origin: parsed.origin || context.origin,
    month: parsed.month || nextMonth(),
    days: parsed.days || 3,
    budget: parsed.budget || 2,
    group: parsed.group || null,
    interests: parsed.interests || [],
    includeAbroad: parsed.includeAbroad || false,
    mentioned: parsed.mentioned,
  };
  const result = recommend(prefs);
  const lines = [result.verdict];
  if (result.mode !== 'compare' || result.picks.length > 2) lines.push('');
  if (result.mode === 'discover' || result.mode === 'check') {
    result.picks.forEach((p, i) => {
      const route = p.facts.route?.hours != null ? ` · ~${formatHours(p.facts.route.hours)} away` : '';
      lines.push(`${i + 1}. **${p.dest.name}**: ${p.score}% match${route}`);
    });
  } else {
    result.picks.forEach((p) => lines.push(`- **${p.dest.name}**: ${p.score}% match${p.warnings[0] ? ` (⚠ ${p.warnings[0]})` : ''}`));
  }
  const top = result.picks[0]?.dest;
  return {
    text: lines.join('\n'),
    actions: result.picks.map((p) => ({ type: 'plan', destId: p.dest.id, days: prefs.days })),
    suggestions: top ? [`How to reach ${top.name}?`, `What to pack for ${top.name}?`, `Best time to visit ${top.name}?`] : WELCOME_SUGGESTIONS,
    lastDestId: top?.id,
    origin: parsed.origin,
  };
}

/**
 * Builds a reply to a chat message.
 * context: { origin, lastDestId, currentDestId } — the traveller's city, the last place discussed and the open trip.
 * Returns { text, actions?, suggestions?, lastDestId?, origin?, autoPlan? }
 */
export async function offlineReply(message, context) {
  const text = message.trim();
  const lower = text.toLowerCase();
  const mentioned = findMentionedDestinations(text);
  const detectedOrigin = detectOrigin(text);
  const origin = ORIGIN_CITIES.find((c) => c.name === (detectedOrigin || context.origin)) || ORIGIN_CITIES[0];
  const contextDest = DESTINATIONS.find((d) => d.id === (context.lastDestId || context.currentDestId));
  const dest = mentioned[0] || contextDest;
  const is = (intent) => INTENTS[intent].test(lower);
  const withDest = (reply, extra = {}) => ({
    text: reply,
    actions: [{ type: 'plan', destId: dest.id }],
    lastDestId: dest.id,
    origin: detectedOrigin,
    ...extra,
  });

  if (!text) return { text: 'Ask me anything about your trip! 😊', suggestions: WELCOME_SUGGESTIONS };

  if (is('greeting') && text.split(/\s+/).length <= 4) {
    return {
      text: 'Namaste! 🙏 I’m your WanderAI travel assistant. I can suggest where to go, compare places, explain how to get there by flight, train or road, and plan your trip.',
      suggestions: WELCOME_SUGGESTIONS,
    };
  }
  if (is('help')) {
    return {
      text: [
        'Here’s what I can help with:',
        '- **Where to go**: “Beach trip in December under budget”',
        '- **Which is better**: “Goa or Kerala for a honeymoon?”',
        '- **Getting there**: “How to reach Manali from Delhi?”',
        '- **Best time & weather**: “Weather in Darjeeling”',
        '- **Budget & packing**: “What to pack for Ladakh?”',
        '- **Planning**: “Plan 3 days in Udaipur”',
      ].join('\n'),
      suggestions: WELCOME_SUGGESTIONS,
    };
  }
  if (is('thanks') && text.split(/\s+/).length <= 4) {
    return { text: 'Happy to help! Have a wonderful trip ✈️ Anything else you’d like to know?' };
  }

  if (mentioned.length >= 2) return recommendReply(text, { origin: origin.name });

  if (dest) {
    if (/\b(cheaper|alternatives?|similar)\b/.test(lower)) return { ...cheaperReply(dest, origin), suggestions: WELCOME_SUGGESTIONS.slice(0, 2) };
    if (is('reach')) return withDest(reachReply(dest, origin), { suggestions: [`Best time to visit ${dest.name}?`, `What to pack for ${dest.name}?`, `Plan a trip to ${dest.name}`] });
    if (is('bestTime')) return withDest(bestTimeReply(dest), { suggestions: [`Weather in ${dest.name} now?`, `How to reach ${dest.name}?`] });
    if (is('weather')) return withDest(await weatherReply(dest), { suggestions: [`What to pack for ${dest.name}?`, `Best time to visit ${dest.name}?`] });
    if (is('cost') && (mentioned.length || !is('recommend'))) return withDest(costReply(dest), { suggestions: [`Cheaper places than ${dest.name}`, `How to reach ${dest.name}?`] });
    if (is('pack')) {
      const month = parseAdvisorQuery(text).month || nextMonth();
      return withDest(packReply(dest, month), { suggestions: [`Weather in ${dest.name} now?`, `Plan a trip to ${dest.name}`] });
    }
    // "Plan it" right after discussing a place plans that place
    if (is('plan') && (mentioned.length || text.split(/\s+/).length <= 4)) {
      const days = parseAdvisorQuery(text).days || dest.days.length;
      return withDest(`Done! ✨ I’ve created your **${days}-day ${dest.name}** itinerary. It’s open on the page now, with timings, costs and how to get there.`, {
        actions: [],
        autoPlan: { destId: dest.id, days },
        suggestions: [`What to pack for ${dest.name}?`, `Weather in ${dest.name} now?`],
      });
    }
    if (mentioned.length && (is('check') || is('recommend'))) return recommendReply(text, { origin: origin.name });
    if (mentioned.length || is('about')) {
      return withDest(aboutReply(dest), { suggestions: [`How to reach ${dest.name}?`, `Best time to visit ${dest.name}?`, `Plan a trip to ${dest.name}`] });
    }
  }

  const parsed = parseAdvisorQuery(text);
  if (is('recommend') || is('cost') || parsed.month || parsed.interests || parsed.group) {
    return recommendReply(text, { origin: origin.name });
  }

  return {
    text: 'Sorry, I didn’t quite get that. 🤔 Try asking where to go, how to reach a place, or the best time to visit. You can name any of my 43 destinations, like Goa, Manali, Kerala or Nepal.',
    suggestions: WELCOME_SUGGESTIONS,
  };
}

// Compact catalogue the AI chat uses to stay grounded in the app's data
export function destinationCatalog() {
  return DESTINATIONS.map((d) => {
    const info = TRAVEL_INFO[d.id];
    const profile = PROFILES[d.id];
    return `${d.id} | ${d.name}, ${d.country} | best: ${info.bestTime} | cost: ${BUDGETS[profile.cost - 1].label} | ${profile.tags.join(', ')} | ${d.days.length} days`;
  }).join('\n');
}
