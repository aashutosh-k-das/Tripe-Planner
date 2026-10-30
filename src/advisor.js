// "Where should I go?" recommendation engine.
// Scores every curated destination on season, interests, budget, travel time from the
// traveller's city, trip length and who is travelling, then explains the result.

import { DESTINATIONS, parseRequestedDays } from './destinations';
import { TRAVEL_INFO, ORIGIN_CITIES, estimateRoutes, formatHours, detectOrigin } from './travelInfo';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// noun/adj are used when writing the verdict ("your love of beaches", "a 3-day beach trip")
export const INTERESTS = [
  { id: 'beach', label: 'Beaches', emoji: '🏖️', noun: 'beaches', adj: 'beach' },
  { id: 'mountains', label: 'Mountains', emoji: '🏔️', noun: 'mountains', adj: 'mountain' },
  { id: 'snow', label: 'Snow', emoji: '❄️', noun: 'snow', adj: 'snow' },
  { id: 'heritage', label: 'History & heritage', emoji: '🏛️', noun: 'history', adj: 'heritage' },
  { id: 'spiritual', label: 'Spiritual', emoji: '🕉️', noun: 'spirituality', adj: 'spiritual' },
  { id: 'food', label: 'Food', emoji: '🍛', noun: 'food', adj: 'food' },
  { id: 'adventure', label: 'Adventure', emoji: '🪂', noun: 'adventure', adj: 'adventure' },
  { id: 'nature', label: 'Nature & wildlife', emoji: '🌿', noun: 'nature', adj: 'nature' },
  { id: 'relax', label: 'Relax & unwind', emoji: '🧘', noun: 'slow, relaxing days', adj: 'relaxing' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🎉', noun: 'nightlife', adj: 'party' },
  { id: 'culture', label: 'Art & culture', emoji: '🎭', noun: 'art and culture', adj: 'culture' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', noun: 'shopping', adj: 'shopping' },
  { id: 'city', label: 'City life', emoji: '🏙️', noun: 'city life', adj: 'city' },
];

export const GROUPS = [
  { id: 'solo', label: 'Solo', emoji: '🎒' },
  { id: 'couple', label: 'Couple', emoji: '💑' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { id: 'friends', label: 'Friends', emoji: '🧑‍🤝‍🧑' },
];

export const BUDGETS = [
  { id: 1, label: 'Budget', symbol: '₹' },
  { id: 2, label: 'Mid-range', symbol: '₹₹' },
  { id: 3, label: 'Luxury', symbol: '₹₹₹' },
];

// tags: interests plus who it suits (couples / families / friends / solo)
// cost: 1 budget-friendly, 2 mid-range, 3 expensive (for a traveller from India)
// cautions: month-specific warnings; note: always-on tip
export const PROFILES = {
  'golden-triangle': { tags: ['heritage', 'food', 'culture', 'shopping', 'city', 'families', 'couples'], cost: 2, cautions: [{ months: [4, 5, 6], text: 'Scorching heat (40°C+): sightsee early in the morning' }, { months: [12, 1], text: 'Dense fog can delay trains and flights' }] },
  goa: { tags: ['beach', 'nightlife', 'food', 'relax', 'heritage', 'couples', 'friends', 'families'], cost: 2, cautions: [{ months: [6, 7, 8, 9], text: 'Monsoon: rough seas, water sports and many beach shacks closed' }, { months: [12], text: 'Christmas–New Year peak: book early, prices surge' }] },
  kerala: { tags: ['nature', 'relax', 'food', 'culture', 'beach', 'couples', 'families'], cost: 2, cautions: [{ months: [6, 7, 8], text: 'Heavy monsoon rain (though it is Ayurveda season)' }] },
  varanasi: { tags: ['spiritual', 'heritage', 'culture', 'food', 'solo'], cost: 1, cautions: [{ months: [4, 5, 6], text: 'Very hot (40°C+)' }, { months: [7, 8, 9], text: 'Monsoon floods can stop boat rides and submerge ghats' }] },
  mumbai: { tags: ['city', 'food', 'nightlife', 'shopping', 'culture', 'friends'], cost: 2, cautions: [{ months: [6, 7, 8, 9], text: 'Heavy monsoon rain and waterlogging' }] },
  amritsar: { tags: ['spiritual', 'heritage', 'food', 'families', 'solo'], cost: 1, cautions: [{ months: [5, 6], text: 'Very hot (40°C+)' }, { months: [12, 1], text: 'Cold, foggy mornings' }] },
  rishikesh: { tags: ['spiritual', 'adventure', 'relax', 'nature', 'mountains', 'friends', 'solo'], cost: 1, cautions: [{ months: [7, 8, 9], text: 'Monsoon: rafting is closed and landslides are common' }] },
  udaipur: { tags: ['heritage', 'culture', 'relax', 'shopping', 'couples', 'families'], cost: 2, cautions: [{ months: [4, 5, 6], text: 'Hot summer (40°C+)' }] },
  ladakh: { tags: ['mountains', 'adventure', 'nature', 'spiritual', 'friends', 'solo'], cost: 2, familyCaution: 'High altitude (3,500 m+) can be tough for young children and elderly travellers', note: 'High altitude: rest for a full day after arriving to acclimatise', cautions: [{ months: [11, 12, 1, 2, 3], text: 'Extreme cold (−15°C) and highways closed; flying is the only way in' }] },
  hyderabad: { tags: ['food', 'heritage', 'shopping', 'city', 'families'], cost: 1, cautions: [{ months: [4, 5], text: 'Hot summer (40°C+)' }] },
  manali: { tags: ['mountains', 'snow', 'adventure', 'nature', 'couples', 'friends', 'families'], cost: 1, cautions: [{ months: [7, 8], text: 'Monsoon landslides can block roads' }, { months: [1, 2], text: 'Heavy snow can close the Atal Tunnel and Solang' }] },
  kashmir: { tags: ['mountains', 'snow', 'nature', 'relax', 'couples', 'families'], cost: 2, cautions: [{ months: [12, 1, 2], text: 'Freezing cold; some roads close after heavy snowfall' }] },
  darjeeling: { tags: ['mountains', 'nature', 'heritage', 'relax', 'couples', 'families'], cost: 1, cautions: [{ months: [6, 7, 8, 9], text: 'Monsoon: clouds hide the mountain views, landslides possible' }] },
  gangtok: { tags: ['mountains', 'nature', 'snow', 'spiritual', 'couples', 'families'], cost: 2, note: 'Permits for Tsomgo Lake and Nathu La are arranged through registered agents', cautions: [{ months: [6, 7, 8, 9], text: 'Monsoon landslides can block NH 10' }, { months: [1, 2], text: 'Snow can close the roads to Nathu La and Tsomgo' }] },
  meghalaya: { tags: ['nature', 'adventure', 'relax', 'friends', 'couples'], cost: 2, cautions: [{ months: [6, 7, 8], text: 'Extremely heavy rain: spectacular waterfalls but slippery treks' }] },
  kolkata: { tags: ['culture', 'heritage', 'food', 'shopping', 'city', 'solo'], cost: 1, cautions: [{ months: [4, 5], text: 'Hot and humid' }, { months: [6, 7, 8, 9], text: 'Humid monsoon with heavy showers' }] },
  jaisalmer: { tags: ['heritage', 'adventure', 'culture', 'couples', 'friends', 'families'], cost: 1, cautions: [{ months: [4, 5, 6, 7, 8], text: 'Extreme desert heat (45°C+); many desert camps close' }] },
  hampi: { tags: ['heritage', 'adventure', 'relax', 'solo', 'friends'], cost: 1, cautions: [{ months: [3, 4, 5], text: 'Very hot (40°C): explore at dawn and dusk' }] },
  'mysuru-coorg': { tags: ['heritage', 'nature', 'relax', 'food', 'families', 'couples'], cost: 2, cautions: [{ months: [6, 7, 8], text: 'Heavy monsoon rain in Coorg' }] },
  pondicherry: { tags: ['beach', 'relax', 'food', 'culture', 'heritage', 'couples'], cost: 2, cautions: [{ months: [10, 11], text: 'North-east monsoon: heavy rain and cyclone risk' }, { months: [4, 5, 6], text: 'Hot and humid' }] },
  'vizag-araku': { tags: ['beach', 'nature', 'relax', 'food', 'families'], cost: 1, cautions: [{ months: [10, 11], text: 'Cyclone season on the coast' }, { months: [4, 5], text: 'Hot and humid' }] },
  andaman: { tags: ['beach', 'adventure', 'nature', 'relax', 'couples', 'families'], cost: 3, cautions: [{ months: [5, 6, 7, 8, 9], text: 'Monsoon: ferries and water sports are often cancelled' }] },
  nepal: { tags: ['mountains', 'spiritual', 'adventure', 'heritage', 'nature', 'friends', 'couples'], cost: 2, cautions: [{ months: [6, 7, 8], text: 'Monsoon: clouds hide the Himalaya and flights get delayed' }] },
  bhutan: { tags: ['mountains', 'spiritual', 'nature', 'heritage', 'relax', 'couples'], cost: 3, note: 'A daily Sustainable Development Fee applies', cautions: [{ months: [6, 7, 8], text: 'Monsoon rain and road blocks' }] },
  'sri-lanka': { tags: ['beach', 'heritage', 'nature', 'food', 'couples', 'families'], cost: 2, cautions: [{ months: [5, 6, 7, 8], text: 'South-west monsoon on the west and south coasts' }] },
  maldives: { tags: ['beach', 'relax', 'adventure', 'couples'], cost: 3, cautions: [{ months: [5, 6, 7, 8, 9, 10], text: 'Wet season: more rain and choppier seas' }] },
  tokyo: { tags: ['city', 'food', 'culture', 'shopping', 'nightlife', 'families'], cost: 3, cautions: [{ months: [6, 7], text: 'Rainy season' }, { months: [8], text: 'Hot and humid' }] },
  bangkok: { tags: ['food', 'nightlife', 'shopping', 'culture', 'city', 'friends'], cost: 2, cautions: [{ months: [4, 5], text: 'Very hot (35°C+)' }, { months: [8, 9, 10], text: 'Heavy afternoon downpours' }] },
  bali: { tags: ['beach', 'nature', 'spiritual', 'relax', 'adventure', 'couples'], cost: 2, cautions: [{ months: [12, 1, 2], text: 'Rainy season' }] },
  singapore: { tags: ['city', 'food', 'shopping', 'culture', 'families'], cost: 3, cautions: [{ months: [11, 12, 1], text: 'Wettest months' }] },
  seoul: { tags: ['city', 'food', 'culture', 'shopping', 'nightlife', 'friends'], cost: 3, cautions: [{ months: [7, 8], text: 'Monsoon and humid heat' }, { months: [12, 1, 2], text: 'Freezing winter' }] },
  vietnam: { tags: ['food', 'nature', 'culture', 'heritage', 'adventure', 'friends'], cost: 2, cautions: [{ months: [7, 8, 9], text: 'Typhoon season: Ha Long Bay cruises may be cancelled' }] },
  dubai: { tags: ['shopping', 'adventure', 'city', 'nightlife', 'families'], cost: 3, cautions: [{ months: [6, 7, 8, 9], text: 'Extreme heat (45°C+)' }] },
  istanbul: { tags: ['heritage', 'food', 'culture', 'shopping', 'city', 'couples'], cost: 3, cautions: [{ months: [12, 1, 2], text: 'Cold and rainy' }] },
  cairo: { tags: ['heritage', 'culture', 'adventure'], cost: 2, cautions: [{ months: [5, 6, 7, 8, 9], text: 'Extreme heat at the pyramids' }] },
  paris: { tags: ['culture', 'food', 'heritage', 'shopping', 'city', 'couples'], cost: 3, cautions: [{ months: [7, 8], text: 'Peak crowds' }] },
  rome: { tags: ['heritage', 'food', 'culture', 'city', 'couples'], cost: 3, cautions: [{ months: [7, 8], text: 'Hot and very crowded' }] },
  london: { tags: ['culture', 'heritage', 'shopping', 'city', 'families'], cost: 3, cautions: [{ months: [11, 12, 1, 2], text: 'Cold, grey and short days' }] },
  barcelona: { tags: ['beach', 'culture', 'food', 'nightlife', 'heritage', 'city', 'friends'], cost: 3, cautions: [{ months: [7, 8], text: 'Very crowded in peak summer' }] },
  'swiss-alps': { tags: ['mountains', 'snow', 'nature', 'adventure', 'couples', 'families'], cost: 3, cautions: [{ months: [4, 5, 11], text: 'Shoulder season: some lifts and mountain trains close for maintenance' }] },
  greece: { tags: ['beach', 'heritage', 'food', 'relax', 'couples'], cost: 3, cautions: [{ months: [11, 12, 1, 2, 3], text: 'Many Santorini hotels and ferries shut in winter' }] },
  'new-york': { tags: ['city', 'culture', 'food', 'shopping', 'nightlife'], cost: 3, cautions: [{ months: [12, 1, 2], text: 'Freezing winters' }] },
  sydney: { tags: ['beach', 'city', 'nature', 'adventure', 'families'], cost: 3, cautions: [{ months: [6, 7, 8], text: 'Winter: too cool for the beaches' }] },
};

const GROUP_TAG = { couple: 'couples', family: 'families', friends: 'friends', solo: 'solo' };
const GROUP_PHRASE = { couple: 'Popular with couples', family: 'Great for families', friends: 'Fun with friends', solo: 'Easy to explore solo' };
const MODE_EMOJI = { air: '✈️', rail: '🚆', road: '🚌' };
const MODE_WORD = { air: 'flight', rail: 'train', road: 'road' };
const interest = (id) => INTERESTS.find((i) => i.id === id);
const listWords = (words) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]);

// Turns "October – March, June (snow)" into a set of month numbers (1–12)
export function parseBestMonths(text) {
  const months = new Set();
  const names = MONTHS.join('|');
  const pattern = new RegExp(`(${names})(?:\\s*[–-]\\s*(${names}))?`, 'g');
  for (const [, start, end] of text.matchAll(pattern)) {
    const from = MONTHS.indexOf(start) + 1;
    const to = end ? MONTHS.indexOf(end) + 1 : from;
    for (let m = from; ; m = (m % 12) + 1) {
      months.add(m);
      if (m === to) break;
    }
  }
  return months;
}

const fastestRoute = (origin, info) => {
  const routes = estimateRoutes(origin, info);
  if (routes.nearby) return { nearby: true };
  return routes.modes.find((m) => m.fastest) || null;
};

function scoreDestination(dest, prefs, origin) {
  const profile = PROFILES[dest.id];
  const info = TRAVEL_INFO[dest.id];
  const reasons = [];
  const warnings = [];
  const facts = {};
  let score = 0;

  // Season (35)
  const best = parseBestMonths(info.bestTime || '');
  const month = prefs.month;
  const prev = month === 1 ? 12 : month - 1;
  const next = month === 12 ? 1 : month + 1;
  if (best.has(month)) {
    score += 35;
    facts.season = 'peak';
    reasons.push(`🌤️ ${MONTHS[month - 1]} is a great time to visit. Best: ${info.bestTime}`);
  } else if (best.has(prev) || best.has(next)) {
    score += 20;
    facts.season = 'shoulder';
    reasons.push(`🌥️ ${MONTHS[month - 1]} is shoulder season, with fewer crowds. Best: ${info.bestTime}`);
  } else {
    score += 4;
    facts.season = 'off';
    warnings.push(`Off-season in ${MONTHS[month - 1]}. Best: ${info.bestTime}`);
  }
  for (const caution of profile.cautions) {
    if (caution.months.includes(month)) {
      score -= 8;
      warnings.push(caution.text);
    }
  }

  // Interests (30)
  const matched = prefs.interests.filter((id) => profile.tags.includes(id));
  facts.matched = matched;
  if (prefs.interests.length === 0) {
    score += 15;
  } else {
    score += Math.round((30 * matched.length) / prefs.interests.length);
    if (matched.length) {
      reasons.push(`🎯 Great for ${listWords(matched.map((id) => interest(id).noun))}`);
    }
  }

  // Budget (15)
  facts.cost = profile.cost;
  const over = profile.cost - prefs.budget;
  if (over <= 0) {
    score += 15;
    if (prefs.budget < 3) reasons.push(`💰 Fits a ${BUDGETS[prefs.budget - 1].label.toLowerCase()} budget`);
  } else {
    score += over === 1 ? 5 : 0;
    warnings.push(over === 1 ? 'A bit pricier than your budget' : 'Well above your budget');
  }

  // Travel time from the traveller's city (15)
  const route = fastestRoute(origin, info);
  facts.route = route;
  if (route?.nearby) {
    score += 15;
    reasons.push(`📍 You’re already there: no travel needed`);
  } else if (route) {
    const h = route.hours;
    score += h <= 3 ? 15 : h <= 6 ? 12 : h <= 10 ? 8 : h <= 16 ? 4 : 1;
    reasons.push(`${MODE_EMOJI[route.mode]} About ${formatHours(h)} from ${origin.name} by ${MODE_WORD[route.mode]}`);
    if (prefs.days <= 3 && h > 8) warnings.push(`Long journey (~${formatHours(h)}) for a ${prefs.days}-day trip`);
  }

  // Trip length (5)
  const ideal = dest.days.length;
  facts.idealDays = ideal;
  if (prefs.days >= ideal) score += 5;
  else if (prefs.days === ideal - 1) score += 3;
  else warnings.push(`Best with at least ${ideal} days`);

  // Who's travelling (bonus up to 5)
  if (prefs.group && profile.tags.includes(GROUP_TAG[prefs.group])) {
    score += 5;
    reasons.push(`${GROUPS.find((g) => g.id === prefs.group).emoji} ${GROUP_PHRASE[prefs.group]}`);
  }
  if (prefs.group === 'family' && profile.familyCaution) {
    score -= 8;
    warnings.push(profile.familyCaution);
  }
  if (profile.note) warnings.push(profile.note);

  return {
    dest,
    profile,
    info,
    score: Math.max(1, Math.min(99, score)),
    reasons,
    warnings,
    facts,
  };
}

// Finds every curated destination named in free text, e.g. "Goa or Kerala?"
export function findMentionedDestinations(text) {
  const normalized = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/\s+/g, ' ')} `;
  const COUNTRY_ONLY = new Set(['india']);
  // Skip the starting point in "from Delhi" or "Delhi to ..."
  const isOrigin = (index, keyword) => normalized.slice(0, index).endsWith(' from') ||
    normalized.slice(index + keyword.length + 1).startsWith(' to ');
  const found = [];
  for (const dest of DESTINATIONS) {
    const index = Math.min(...dest.keywords
      .filter((k) => !COUNTRY_ONLY.has(k))
      .map((k) => ({ k, i: normalized.indexOf(` ${k} `) }))
      .filter(({ k, i }) => i !== -1 && !isOrigin(i, k))
      .map(({ i }) => i));
    if (Number.isFinite(index)) found.push({ dest, index });
  }
  return found.sort((a, b) => a.index - b.index).map(({ dest }) => dest);
}

const INTEREST_WORDS = {
  beach: ['beach', 'beaches', 'sea', 'island', 'islands', 'coast'],
  mountains: ['mountain', 'mountains', 'hill', 'hills', 'himalaya', 'himalayas', 'trek', 'trekking'],
  snow: ['snow', 'snowfall', 'skiing', 'ski'],
  heritage: ['history', 'historical', 'heritage', 'fort', 'forts', 'palace', 'palaces', 'monument', 'monuments'],
  spiritual: ['spiritual', 'temple', 'temples', 'pilgrimage', 'yoga', 'meditation'],
  food: ['food', 'foodie', 'cuisine', 'street food'],
  adventure: ['adventure', 'rafting', 'paragliding', 'scuba', 'diving', 'bungee', 'camping'],
  nature: ['nature', 'wildlife', 'waterfall', 'waterfalls', 'greenery', 'forest'],
  relax: ['relax', 'relaxing', 'peaceful', 'calm', 'quiet', 'chill'],
  nightlife: ['nightlife', 'party', 'parties', 'clubs', 'pubs'],
  culture: ['culture', 'art', 'museum', 'museums'],
  shopping: ['shopping', 'markets', 'market'],
  city: ['city', 'cities', 'urban'],
};

/** Reads preferences out of a free-text question like "Goa or Kerala for a honeymoon in December?" */
export function parseAdvisorQuery(text) {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const result = {};

  // "may" only counts as a month after words like "in" or "during"
  const monthIndex = MONTHS.findIndex((m) => m === 'May'
    ? / (in|during|this|next|of|early|late|mid) may /.test(lower)
    : lower.includes(` ${m.toLowerCase()} `) || lower.includes(` ${m.slice(0, 3).toLowerCase()} `));
  if (monthIndex !== -1) result.month = monthIndex + 1;

  const days = parseRequestedDays(text);
  if (days) result.days = Math.min(Math.max(days, 1), 10);

  const origin = detectOrigin(text);
  if (origin) result.origin = origin;

  const interests = Object.entries(INTEREST_WORDS)
    .filter(([, words]) => words.some((w) => lower.includes(` ${w} `)))
    .map(([id]) => id);
  if (interests.length) result.interests = interests;

  if (/ (honeymoon|romantic|couple|wife|husband|partner|girlfriend|boyfriend) /.test(lower)) result.group = 'couple';
  else if (/ (family|kids|children|parents) /.test(lower)) result.group = 'family';
  else if (/ (friends|gang|bachelor) /.test(lower)) result.group = 'friends';
  else if (/ (solo|alone|myself) /.test(lower)) result.group = 'solo';

  if (/ (cheap|budget|low cost|affordable|student) /.test(lower)) result.budget = 1;
  else if (/ (luxury|premium|lavish) /.test(lower)) result.budget = 3;

  if (/ (abroad|international|foreign|overseas) /.test(lower)) result.includeAbroad = true;

  result.mentioned = findMentionedDestinations(text);
  return result;
}

function verdictFor(results, prefs, origin, mentioned, alternatives) {
  const [top, second] = results;
  const month = MONTHS[prefs.month - 1];
  if (!top) return '';

  const why = (r) => {
    const bits = [];
    if (r.facts.season === 'peak') bits.push(`it’s in peak season in ${month}`);
    else if (r.facts.season === 'shoulder') bits.push(`${month} is a quieter shoulder month`);
    if (r.facts.route) bits.push(`it’s about ${formatHours(r.facts.route.hours)} away by ${MODE_WORD[r.facts.route.mode]}`);
    if (r.facts.matched.length) bits.push(`it matches your love of ${listWords(r.facts.matched.slice(0, 2).map((id) => interest(id).noun))}`);
    return bits.length ? listWords(bits) : 'it balances season, cost and travel time best';
  };
  const betterOption = alternatives.find((r) => r.score >= 70 && r.score > top.score + 10);
  // The most specific warning, e.g. "Extreme cold" rather than "Off-season"
  const mainWarning = (r) => r.warnings.find((w) => !w.startsWith('Off-season')) || r.warnings[0];

  if (mentioned.length === 1) {
    if (top.score >= 60) {
      return `Yes, ${top.dest.name} is a good choice: ${why(top)}.${second ? ` If you want options, ${second.dest.name} also scores well.` : ''}`;
    }
    return `${top.dest.name} isn’t ideal for this trip.${mainWarning(top) ? ` Watch out: ${mainWarning(top)}.` : ''}${second ? ` ${second.dest.name} is a better fit, because ${why(second)}.` : ''}`;
  }

  if (mentioned.length >= 2) {
    let text = `${mentioned.map((d) => d.name).join(' vs ')}: ${top.dest.name} is the better pick for you, because ${why(top)}.`;
    if (second && second.score === top.score) {
      // A tie: point out what makes each one different instead
      const only = (a, b) => a.profile.tags.find((t) => interest(t) && !b.profile.tags.includes(t));
      const topExtra = only(top, second);
      const secondExtra = only(second, top);
      text = `${mentioned.map((d) => d.name).join(' vs ')}: it’s a tie at ${top.score}%. Both work well for your dates.`;
      if (topExtra && secondExtra) {
        text += ` Pick ${top.dest.name} for ${interest(topExtra).noun}, or ${second.dest.name} for ${interest(secondExtra).noun}.`;
      }
      if (mainWarning(top)) text += ` Watch out (${top.dest.name}): ${mainWarning(top)}.`;
    } else if (second) {
      text += ` ${second.dest.name} scores ${top.score - second.score} points lower.${mainWarning(second) ? ` Watch out: ${mainWarning(second)}.` : ''}`;
    }
    if (top.score < 55 && betterOption) {
      text += ` Honestly, neither is ideal in ${month}. ${betterOption.dest.name} scores ${betterOption.score}% for these dates.`;
    }
    return text;
  }

  const style = prefs.interests.slice(0, 2).map((id) => interest(id).adj).join(' & ');
  let text = `For a ${prefs.days}-day ${style ? `${style} ` : ''}trip from ${origin.name} in ${month}, ${top.dest.name} is your best match: ${why(top)}.`;
  if (second) {
    const extra = second.facts.matched.find((id) => !top.facts.matched.includes(id)) ||
      second.profile.tags.find((t) => interest(t) && !top.profile.tags.includes(t));
    text += extra
      ? ` Prefer more ${interest(extra).noun}? ${second.dest.name} is a great alternative.`
      : ` ${second.dest.name} is a close second.`;
  }
  return text;
}

/**
 * Ranks destinations for the given preferences.
 * prefs: { origin, month (1–12), days, budget (1–3), group, interests[], includeAbroad, query }
 */
export function recommend(prefs) {
  const origin = ORIGIN_CITIES.find((c) => c.name === prefs.origin) || ORIGIN_CITIES[0];
  const mentioned = prefs.mentioned || [];

  let pool = DESTINATIONS.filter((d) => PROFILES[d.id] && TRAVEL_INFO[d.id]);
  if (mentioned.length < 2 && !prefs.includeAbroad) pool = pool.filter((d) => d.region === 'India' || mentioned.includes(d));
  // Don't suggest a holiday in the city you live in, unless you asked about it
  pool = pool.filter((d) => mentioned.includes(d) || !estimateRoutes(origin, TRAVEL_INFO[d.id]).nearby);

  const scored = pool.map((dest) => scoreDestination(dest, prefs, origin)).sort((a, b) => b.score - a.score);

  let picks;
  if (mentioned.length >= 2) {
    picks = scored.filter((r) => mentioned.includes(r.dest)).slice(0, 3);
  } else if (mentioned.length === 1) {
    const asked = scored.find((r) => r.dest === mentioned[0]);
    picks = [asked, ...scored.filter((r) => r !== asked).slice(0, 2)].filter(Boolean);
  } else {
    picks = scored.slice(0, 3);
  }

  const alsoConsider = scored.filter((r) => !picks.includes(r)).slice(0, 4);
  return {
    origin,
    picks,
    alsoConsider,
    verdict: verdictFor(picks, prefs, origin, mentioned, alsoConsider),
    mode: mentioned.length >= 2 ? 'compare' : mentioned.length === 1 ? 'check' : 'discover',
  };
}

export { MODE_EMOJI, MODE_WORD };
