// How to reach each destination by air, rail, road (and sea), plus a door-to-door time estimator.
// `km` is the distance from the airport / railhead to the destination; `coords` marks a railhead
// that is far from the destination (e.g. Manali's nearest railway is in Chandigarh).

export const ORIGIN_CITIES = [
  { name: 'Delhi', coords: [28.6139, 77.209], aliases: ['new delhi'] },
  { name: 'Mumbai', coords: [19.076, 72.8777], aliases: ['bombay'] },
  { name: 'Bengaluru', coords: [12.9716, 77.5946], aliases: ['bangalore'] },
  { name: 'Chennai', coords: [13.0827, 80.2707], aliases: ['madras'] },
  { name: 'Kolkata', coords: [22.5726, 88.3639], aliases: ['calcutta'] },
  { name: 'Hyderabad', coords: [17.385, 78.4867] },
  { name: 'Pune', coords: [18.5204, 73.8567] },
  { name: 'Ahmedabad', coords: [23.0225, 72.5714] },
  { name: 'Jaipur', coords: [26.9124, 75.7873] },
  { name: 'Lucknow', coords: [26.8467, 80.9462] },
  { name: 'Chandigarh', coords: [30.7333, 76.7794] },
  { name: 'Bhopal', coords: [23.2599, 77.4126] },
  { name: 'Patna', coords: [25.5941, 85.1376] },
  { name: 'Guwahati', coords: [26.1445, 91.7362] },
  { name: 'Kochi', coords: [9.9312, 76.2673], aliases: ['cochin'] },
  { name: 'Vijayawada', coords: [16.5062, 80.648] },
  { name: 'Visakhapatnam', coords: [17.6868, 83.2185], aliases: ['vizag'] },
];

// Finds a starting city in phrases like "from Pune" or "Mumbai to Goa"
export function detectOrigin(input) {
  const text = ` ${input.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const city = ORIGIN_CITIES.find(({ name, aliases = [] }) =>
    [name.toLowerCase(), ...aliases].some((alias) => text.includes(` from ${alias} `) || text.startsWith(` ${alias} to `))
  );
  return city ? city.name : null;
}

export const TRAVEL_INFO = {
  // ---------- India ----------
  'golden-triangle': {
    coords: [28.6139, 77.209], bestTime: 'October – March',
    air: { hub: 'Indira Gandhi International, Delhi (DEL)', km: 15, note: 'Direct flights from every major Indian city. Agra (AGR) and Jaipur (JAI) also have airports.' },
    rail: { hub: 'New Delhi (NDLS) & Hazrat Nizamuddin (NZM)', km: 0, note: 'Rajdhani, Shatabdi and Vande Bharat trains from across India. Gatimaan Express reaches Agra in about 1h 40m.' },
    road: { note: 'Yamuna Expressway to Agra (~3.5 h) and NH 48 to Jaipur (~5 h). Volvo buses run from most North Indian cities.' },
  },
  goa: {
    coords: [15.4909, 73.8278], bestTime: 'November – February',
    air: { hub: 'Dabolim (GOI) & Manohar International, Mopa (GOX)', km: 30, note: 'Direct flights from all metros; Mopa serves North Goa, Dabolim the south.' },
    rail: { hub: 'Madgaon (MAO) & Thivim (THVM)', km: 20, note: 'On the scenic Konkan Railway: 8–12 hours from Mumbai, with trains from Delhi, Bengaluru and Kerala.' },
    road: { note: 'NH 66 along the coast. Overnight sleeper buses from Mumbai, Pune, Bengaluru and Hyderabad.' },
  },
  kerala: {
    coords: [9.9312, 76.2673], bestTime: 'September – March',
    air: { hub: 'Cochin International (COK)', km: 30, note: 'Direct flights from all metros and the Gulf. Thiruvananthapuram (TRV) and Kozhikode (CCJ) are alternatives.' },
    rail: { hub: 'Ernakulam Junction (ERS)', km: 2, note: 'Well connected to Chennai, Bengaluru, Mumbai and Delhi. Vande Bharat runs along the Kerala coast.' },
    road: { note: 'NH 66 and NH 544. KSRTC and private sleeper buses from Bengaluru, Chennai and Coimbatore.' },
  },
  varanasi: {
    coords: [25.3176, 82.9739], bestTime: 'October – March',
    air: { hub: 'Lal Bahadur Shastri International (VNS)', km: 25, note: 'Direct flights from Delhi, Mumbai, Bengaluru, Hyderabad and Kolkata.' },
    rail: { hub: 'Varanasi Junction (BSB) & Banaras (BSBS)', km: 3, note: 'Vande Bharat from New Delhi in about 8 hours; major junction for trains from all over India.' },
    road: { note: 'NH 19 from Prayagraj (~3 h); Purvanchal Expressway from Lucknow (~5 h).' },
  },
  mumbai: {
    coords: [19.076, 72.8777], bestTime: 'November – February',
    air: { hub: 'Chhatrapati Shivaji Maharaj International (BOM)', km: 12, note: 'India’s second-busiest airport, with flights from everywhere.' },
    rail: { hub: 'CSMT, Mumbai Central (MMCT) & Lokmanya Tilak (LTT)', km: 0, note: 'Rajdhani from Delhi (~16 h); Vande Bharat to Ahmedabad, Goa and Solapur.' },
    road: { note: 'Mumbai–Pune Expressway (~3 h from Pune), NH 48 from Ahmedabad and the Samruddhi Expressway from Nagpur.' },
  },
  amritsar: {
    coords: [31.634, 74.8723], bestTime: 'October – March',
    air: { hub: 'Sri Guru Ram Dass Jee International (ATQ)', km: 11, note: 'Direct flights from Delhi, Mumbai, Bengaluru and Srinagar.' },
    rail: { hub: 'Amritsar Junction (ASR)', km: 2, note: 'Shatabdi and Vande Bharat from New Delhi in about 6 hours.' },
    road: { note: 'NH 44 (Grand Trunk Road) from Delhi, ~8 hours; frequent Volvo buses.' },
  },
  rishikesh: {
    coords: [30.0869, 78.2676], hills: true, bestTime: 'September – November, February – May',
    air: { hub: 'Dehradun Jolly Grant (DED)', km: 20, note: 'Flights from Delhi, Mumbai, Bengaluru and Hyderabad; 40 minutes by taxi.' },
    rail: { hub: 'Yog Nagari Rishikesh (YNRK) or Haridwar (HW)', km: 10, note: 'Shatabdi and Vande Bharat reach Haridwar from Delhi in about 4.5 hours.' },
    road: { note: 'NH 334 from Delhi via Haridwar, about 6 hours; Uttarakhand Roadways buses from ISBT Kashmere Gate.' },
  },
  udaipur: {
    coords: [24.5854, 73.7125], bestTime: 'September – March',
    air: { hub: 'Maharana Pratap Airport (UDR)', km: 22, note: 'Direct flights from Delhi, Mumbai, Bengaluru and Hyderabad.' },
    rail: { hub: 'Udaipur City (UDZ)', km: 3, note: 'Vande Bharat from Jaipur; overnight trains from Delhi and Ahmedabad.' },
    road: { note: 'NH 48 from Ahmedabad (~4.5 h) and NH 27 / NH 48 from Jaipur (~6 h).' },
  },
  ladakh: {
    coords: [34.1526, 77.5771], hills: true, bestTime: 'June – September',
    air: { hub: 'Kushok Bakula Rimpochee Airport, Leh (IXL)', km: 5, note: 'Year-round flights from Delhi, Mumbai and Srinagar; the only way in during winter. Rest on arrival to acclimatise.' },
    rail: { hub: 'Srinagar (SINA)', km: 420, coords: [34.0837, 74.7973], note: 'No railway in Ladakh. Take a train to Srinagar, then drive 2 days via Zoji La.' },
    road: { note: 'Srinagar–Leh highway (open ~May–Nov) or the Manali–Leh highway (~Jun–Oct). Both are 2-day drives over high passes.' },
  },
  hyderabad: {
    coords: [17.385, 78.4867], bestTime: 'October – February',
    air: { hub: 'Rajiv Gandhi International (HYD)', km: 30, note: 'Major hub with flights from all Indian cities.' },
    rail: { hub: 'Secunderabad (SC), Hyderabad (HYB) & Kacheguda (KCG)', km: 0, note: 'Vande Bharat to Visakhapatnam, Tirupati and Bengaluru; Rajdhani from Delhi.' },
    road: { note: 'NH 65 from Vijayawada (~4.5 h), NH 44 from Bengaluru (~9 h). Frequent TSRTC and APSRTC buses.' },
  },
  manali: {
    coords: [32.2432, 77.1892], hills: true, bestTime: 'March – June (greenery), December – February (snow)',
    air: { hub: 'Kullu-Manali Airport, Bhuntar (KUU)', km: 50, note: 'Few flights, mainly from Delhi, and often cancelled in bad weather.' },
    rail: { hub: 'Chandigarh (CDG)', km: 310, coords: [30.7333, 76.7794], note: 'No railway to Manali. Take a train to Chandigarh, then an 8–9 hour bus or taxi.' },
    road: { note: 'Overnight Volvo buses from Delhi (~12 h) via Chandigarh and Mandi on NH 3.' },
  },
  kashmir: {
    coords: [34.0837, 74.7973], hills: true, bestTime: 'March – October (December – February for snow)',
    air: { hub: 'Sheikh ul-Alam International, Srinagar (SXR)', km: 12, note: 'Direct flights from Delhi, Mumbai, Bengaluru and Jammu.' },
    rail: { hub: 'Srinagar (SINA) via Katra', km: 10, note: 'Since 2025 the line over the Chenab Bridge links Katra to Srinagar; change to the Vande Bharat at Katra.' },
    road: { note: 'NH 44 from Jammu, about 8 hours through the Banihal tunnels.' },
  },
  darjeeling: {
    coords: [27.041, 88.2663], hills: true, bestTime: 'March – May, October – December',
    air: { hub: 'Bagdogra (IXB)', km: 70, note: 'Direct flights from Delhi, Kolkata, Bengaluru and Mumbai; 3 hours by shared jeep or taxi.' },
    rail: { hub: 'New Jalpaiguri (NJP)', km: 75, coords: [26.6837, 88.4413], note: 'Major junction with trains from Delhi and Kolkata; ride the toy train or a jeep up the hill.' },
    road: { note: 'Hill Cart Road / Rohini Road from Siliguri, about 3 hours by shared jeep.' },
  },
  gangtok: {
    coords: [27.3389, 88.6065], hills: true, bestTime: 'March – May, October – December',
    air: { hub: 'Bagdogra (IXB)', km: 125, note: 'Most travellers fly into Bagdogra, then take a 4–5 hour taxi. Pakyong (PYG) has limited flights.' },
    rail: { hub: 'New Jalpaiguri (NJP)', km: 120, coords: [26.6837, 88.4413], note: 'Nearest major railhead; shared jeeps leave from outside the station.' },
    road: { note: 'NH 10 from Siliguri along the Teesta river, 4–5 hours.' },
  },
  meghalaya: {
    coords: [25.5788, 91.8933], hills: true, bestTime: 'October – April (June – September for monsoon waterfalls)',
    air: { hub: 'Lokpriya Gopinath Bordoloi International, Guwahati (GAU)', km: 120, note: 'Fly to Guwahati, then a 3-hour drive. Shillong (SHL) has a few small flights.' },
    rail: { hub: 'Guwahati (GHY)', km: 100, coords: [26.1806, 91.751], note: 'Rajdhani and long-distance trains from Delhi, Kolkata and Bengaluru.' },
    road: { note: 'NH 6 from Guwahati, about 3 hours; shared Sumos leave from Paltan Bazaar.' },
  },
  kolkata: {
    coords: [22.5726, 88.3639], bestTime: 'October – March',
    air: { hub: 'Netaji Subhas Chandra Bose International (CCU)', km: 15, note: 'Gateway to East and Northeast India, with flights from all cities.' },
    rail: { hub: 'Howrah (HWH) & Sealdah (SDAH)', km: 0, note: 'Rajdhani from Delhi (~17 h); trains to every corner of India.' },
    road: { note: 'NH 16 from Odisha and Andhra Pradesh; NH 19 and the Durgapur Expressway from the west.' },
  },
  jaisalmer: {
    coords: [26.9157, 70.9083], bestTime: 'October – March',
    air: { hub: 'Jaisalmer Airport (JSA)', km: 13, note: 'Seasonal flights (mostly October–March). Jodhpur (JDH) is a year-round alternative, 5 hours away.' },
    rail: { hub: 'Jaisalmer (JSM)', km: 2, note: 'Overnight trains from Delhi and Jaipur via Jodhpur.' },
    road: { note: 'NH 11 from Jodhpur, about 5 hours; sleeper buses from Jaipur and Ahmedabad.' },
  },
  hampi: {
    coords: [15.335, 76.46], bestTime: 'October – February',
    air: { hub: 'Jindal Vijayanagar Airport (VDY)', km: 40, note: 'Limited flights from Bengaluru and Hyderabad. Hubballi (HBX), 160 km away, has more options.' },
    rail: { hub: 'Hosapete Junction (HPT)', km: 13, note: 'The overnight Hampi Express runs from Bengaluru and Mysuru.' },
    road: { note: 'About 6–7 hours from Bengaluru; KSRTC sleeper buses to Hosapete.' },
  },
  'mysuru-coorg': {
    coords: [12.2958, 76.6394], bestTime: 'October – March',
    air: { hub: 'Kempegowda International, Bengaluru (BLR)', km: 170, note: 'Fly to Bengaluru, then drive or take the train. Mysuru (MYQ) has a few small flights.' },
    rail: { hub: 'Mysuru Junction (MYS)', km: 2, note: 'Shatabdi and Vande Bharat from Chennai via Bengaluru (~2 h from Bengaluru).' },
    road: { note: 'Bengaluru–Mysuru Expressway, about 2.5 hours; Coorg is 3 more hours.' },
  },
  pondicherry: {
    coords: [11.9416, 79.8083], bestTime: 'October – March',
    air: { hub: 'Chennai International (MAA)', km: 150, note: 'Fly to Chennai, then a 3-hour drive. Puducherry (PNY) has limited flights.' },
    rail: { hub: 'Puducherry (PDY)', km: 2, note: 'A few direct trains; more options via Villupuram (VM), 40 km away.' },
    road: { note: 'The scenic East Coast Road from Chennai, about 3 hours.' },
  },
  'vizag-araku': {
    coords: [17.6868, 83.2185], bestTime: 'October – March',
    air: { hub: 'Visakhapatnam International (VTZ)', km: 12, note: 'Direct flights from Delhi, Mumbai, Bengaluru, Chennai, Hyderabad and Kolkata.' },
    rail: { hub: 'Visakhapatnam Junction (VSKP)', km: 2, note: 'Major East Coast hub; Vande Bharat from Secunderabad (~8.5 h).' },
    road: { note: 'NH 16 from Vijayawada, about 6 hours; frequent APSRTC buses.' },
  },
  andaman: {
    coords: [11.6234, 92.7265], bestTime: 'November – April',
    air: { hub: 'Veer Savarkar International, Port Blair (IXZ)', km: 5, note: 'Direct flights from Chennai, Kolkata, Delhi, Bengaluru and Hyderabad.' },
    rail: null,
    road: null,
    sea: { hub: 'Port Blair Haddo Wharf', note: 'Passenger ships from Chennai, Kolkata and Visakhapatnam take 50–60 hours.' },
  },

  // ---------- India's neighbours ----------
  nepal: {
    coords: [27.7172, 85.324], hills: true, international: true, bestTime: 'October – November, March – April',
    air: { hub: 'Tribhuvan International, Kathmandu (KTM)', km: 6, note: 'Direct flights from Delhi, Mumbai, Bengaluru, Kolkata and Varanasi.' },
    rail: { hub: 'Raxaul (RXL), India', km: 270, coords: [26.9804, 84.851], note: 'No train to Kathmandu. Take a train to Raxaul or Gorakhpur, then cross the border by road.' },
    road: { note: 'Cross at Sonauli–Bhairahawa or Raxaul–Birgunj. Indian citizens need only a passport or voter ID.' },
  },
  bhutan: {
    coords: [27.4305, 89.4133], hills: true, international: true, bestTime: 'March – May, September – November',
    air: { hub: 'Paro International (PBH)', km: 6, note: 'Druk Air and Bhutan Airlines fly from Delhi, Kolkata, Bagdogra and Guwahati.' },
    rail: { hub: 'Hasimara (HSX), India', km: 170, coords: [26.7, 89.35], note: 'Nearest railhead, 18 km from the Phuentsholing border; then a 5-hour drive to Paro.' },
    road: { note: 'Enter at Jaigaon–Phuentsholing. Indians need a passport or voter ID and pay a reduced Sustainable Development Fee.' },
  },
  'sri-lanka': {
    coords: [6.9271, 79.8612], international: true, bestTime: 'December – April (west & south coasts)',
    air: { hub: 'Bandaranaike International, Colombo (CMB)', km: 35, note: 'About 1.5 hours from Chennai; direct flights from many Indian cities.' },
    rail: null,
    road: null,
    sea: { hub: 'Nagapattinam → Kankesanthurai', note: 'A passenger ferry from Tamil Nadu to Jaffna (~4 h) runs when in service.' },
  },
  maldives: {
    coords: [4.1755, 73.5093], international: true, bestTime: 'November – April',
    air: { hub: 'Velana International, Malé (MLE)', km: 2, note: 'Direct flights from Kochi, Bengaluru, Mumbai, Delhi and Chennai.' },
  },

  // ---------- Further afield (flights from India) ----------
  tokyo: { coords: [35.6762, 139.6503], international: true, bestTime: 'March – May, October – November', air: { hub: 'Haneda (HND) & Narita (NRT)', km: 20, note: 'Direct flights from Delhi, Mumbai and Bengaluru.' } },
  bangkok: { coords: [13.7563, 100.5018], international: true, bestTime: 'November – February', air: { hub: 'Suvarnabhumi (BKK) & Don Mueang (DMK)', km: 30, note: 'Many direct flights from Indian metros (~4 h from Delhi).' } },
  bali: { coords: [-8.5069, 115.2625], international: true, bestTime: 'April – October', air: { hub: 'Ngurah Rai International (DPS)', km: 35, note: 'Direct flights from Delhi, Mumbai and Bengaluru.' } },
  singapore: { coords: [1.3521, 103.8198], international: true, bestTime: 'February – April', air: { hub: 'Changi (SIN)', km: 20, note: 'Direct flights from most large Indian cities.' } },
  seoul: { coords: [37.5665, 126.978], international: true, bestTime: 'April – May, September – November', air: { hub: 'Incheon International (ICN)', km: 50, note: 'Direct flights from Delhi and Mumbai.' } },
  vietnam: { coords: [21.0278, 105.8342], international: true, bestTime: 'October – April', air: { hub: 'Noi Bai International, Hanoi (HAN)', km: 30, note: 'Direct flights from Delhi, Mumbai and Kolkata.' } },
  dubai: { coords: [25.2048, 55.2708], international: true, bestTime: 'November – March', air: { hub: 'Dubai International (DXB)', km: 10, note: 'Flights from almost every Indian city (~3.5 h from Delhi).' } },
  istanbul: { coords: [41.0082, 28.9784], international: true, bestTime: 'April – May, September – October', air: { hub: 'Istanbul Airport (IST)', km: 40, note: 'Direct flights from Delhi and Mumbai.' } },
  cairo: { coords: [30.0444, 31.2357], international: true, bestTime: 'October – April', air: { hub: 'Cairo International (CAI)', km: 20, note: 'Direct flights from Delhi and Mumbai.' } },
  paris: { coords: [48.8566, 2.3522], international: true, bestTime: 'April – June, September – October', air: { hub: 'Charles de Gaulle (CDG)', km: 30, note: 'Direct flights from Delhi, Mumbai and Bengaluru.' } },
  rome: { coords: [41.9028, 12.4964], international: true, bestTime: 'April – June, September – October', air: { hub: 'Fiumicino (FCO)', km: 30, note: 'Direct from Delhi, or connect via the Gulf.' } },
  london: { coords: [51.5074, -0.1278], international: true, bestTime: 'May – September', air: { hub: 'Heathrow (LHR)', km: 25, note: 'Direct flights from most Indian metros.' } },
  barcelona: { coords: [41.3874, 2.1686], international: true, bestTime: 'May – June, September – October', air: { hub: 'Barcelona–El Prat (BCN)', km: 15, note: 'Connect via the Gulf or a European hub.' } },
  'swiss-alps': { coords: [46.6863, 7.8632], international: true, hills: true, bestTime: 'June – September, December – March', air: { hub: 'Zurich (ZRH)', km: 130, note: 'Direct flights from Delhi and Mumbai, then 2 hours by Swiss train.' } },
  greece: { coords: [37.9838, 23.7275], international: true, bestTime: 'May – June, September – October', air: { hub: 'Athens International (ATH)', km: 30, note: 'Direct flights from Delhi, or connect via the Gulf.' } },
  'new-york': { coords: [40.7128, -74.006], international: true, bestTime: 'April – June, September – November', air: { hub: 'JFK & Newark (EWR)', km: 25, note: 'Non-stop flights from Delhi and Mumbai (~15 h).' } },
  sydney: { coords: [-33.8688, 151.2093], international: true, bestTime: 'September – November, March – May', air: { hub: 'Sydney Kingsford Smith (SYD)', km: 10, note: 'Direct flights from Delhi and Bengaluru.' } },
};

// Generic route info for destinations we only know by coordinates (e.g. AI-generated trips)
export function inferTravelInfo(coords, countryCode) {
  const inIndia = countryCode === 'IN';
  const neighbour = countryCode === 'NP' || countryCode === 'BT';
  return {
    coords,
    inferred: true,
    international: !inIndia,
    air: { hub: 'Nearest airport', km: 30, note: 'Estimated from distance. Check which airport is closest to your stay.' },
    rail: inIndia ? { hub: 'Nearest railway station', km: 10, note: 'Estimated from distance. Search on IRCTC for direct trains.' } : null,
    road: inIndia || neighbour ? { note: 'Estimated from distance. State and private buses usually serve popular routes.' } : null,
  };
}

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const roadHours = (km, hills) => km / (hills ? 35 : 50);

/**
 * Estimates door-to-door travel time from an origin city for each mode.
 * Rough heuristics: road ≈ 1.3× straight-line distance at highway speeds (1.4× and slower to hill stations),
 * rail ≈ 1.2× at Indian express-train speeds, flights include check-in and airport transfers.
 */
export function estimateRoutes(origin, info) {
  const straight = distanceKm(origin.coords, info.coords);
  if (straight < 40) return { nearby: true, distance: Math.round(straight), modes: [] };

  const modes = [];

  if (info.air) {
    const flight = straight / (straight > 3000 ? 820 : 750) + 0.5;
    const overhead = (info.international ? 3.5 : 2.5) + roadHours(info.air.km, info.hills);
    modes.push({
      mode: 'air',
      available: straight >= 300,
      reason: 'Too close to fly — go by road or rail',
      hours: flight + overhead,
      breakdown: `${formatHours(flight)} flight + check-in & ${info.air.km} km transfer`,
      ...info.air,
    });
  }

  if (info.rail !== undefined && !info.international) {
    if (info.rail) {
      const railStart = info.rail.coords || info.coords;
      const railKm = distanceKm(origin.coords, railStart) * 1.2;
      const train = railKm / (railKm < 400 ? 55 : railKm < 1000 ? 62 : 70);
      const transfer = roadHours(info.rail.km, info.hills);
      modes.push({
        mode: 'rail',
        available: true,
        hours: train + 0.5 + transfer,
        breakdown: info.rail.km > 30 ? `${formatHours(train)} train + ${info.rail.km} km by road` : `${formatHours(train)} by express train`,
        ...info.rail,
      });
    } else {
      modes.push({ mode: 'rail', available: false, reason: 'No railway line to this destination' });
    }
  } else if (info.rail && info.international) {
    // Neighbouring countries: train to the Indian border railhead, then road
    const railKm = distanceKm(origin.coords, info.rail.coords) * 1.2;
    const train = railKm / (railKm < 400 ? 55 : railKm < 1000 ? 62 : 70);
    modes.push({
      mode: 'rail',
      available: true,
      hours: train + 0.5 + roadHours(info.rail.km, info.hills),
      breakdown: `${formatHours(train)} train + ${info.rail.km} km by road`,
      ...info.rail,
    });
  }

  if (info.road !== undefined) {
    if (info.road) {
      const roadKm = straight * (info.hills ? 1.4 : 1.3);
      // Long hill journeys are mostly on plains highways until the final climb
      const hours = roadKm / (info.hills ? 45 : 50);
      modes.push({ mode: 'road', available: true, hours, breakdown: `~${Math.round(roadKm / 10) * 10} km by car or bus`, ...info.road });
    } else {
      modes.push({ mode: 'road', available: false, reason: info.sea ? 'Island destination — no road link' : 'No road link from India' });
    }
  }

  if (info.sea) {
    modes.push({ mode: 'sea', available: true, hours: null, ...info.sea });
  }

  // Fastest overall, plus a cheaper ground option when it's reasonable.
  // Rail counts as the budget pick only if it doesn't leave a long road leg at the end.
  const timed = modes.filter((m) => m.available && m.hours != null);
  const fastest = timed.reduce((best, m) => (!best || m.hours < best.hours ? m : best), null);
  if (fastest) fastest.fastest = true;
  const rail = timed.find((m) => m.mode === 'rail' && m.km < 100);
  const road = timed.find((m) => m.mode === 'road');
  const budget = [rail, road].find((m) => m && m !== fastest && m.hours <= 30);
  if (budget) budget.budget = true;

  return { nearby: false, distance: Math.round(straight), modes };
}

export function formatHours(hours) {
  if (hours == null) return '';
  const totalMinutes = Math.round((hours * 60) / 15) * 15;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
