// Constants and mappings used across the TL;DR summarizer

export interface RegionConfig {
  name: string;
  gl: string;
  geo: string;
}

export const REGION_MAP: { [key: string]: RegionConfig } = {
  global: { name: "Global", gl: "US", geo: "World" },
  lithuania: { name: "Lithuania", gl: "LT", geo: "Lithuania" },
  "united-states": { name: "United States", gl: "US", geo: "United States" },
  "united-kingdom": { name: "United Kingdom", gl: "GB", geo: "United Kingdom" },
  germany: { name: "Germany", gl: "DE", geo: "Germany" },
  france: { name: "France", gl: "FR", geo: "France" },
  india: { name: "India", gl: "IN", geo: "India" },
  japan: { name: "Japan", gl: "JP", geo: "Japan" },
  brazil: { name: "Brazil", gl: "BR", geo: "Brazil" },
  australia: { name: "Australia", gl: "AU", geo: "Australia" }
};

// Preferred language to fetch feeds for a given region
export const FEED_LANG_MAP: { [key: string]: string } = {
  global: 'en',
  lithuania: 'lt',
  'united-states': 'en',
  'united-kingdom': 'en',
  germany: 'de',
  france: 'fr',
  india: 'en',
  japan: 'ja',
  brazil: 'pt',
  australia: 'en'
};

export const CATEGORY_QUERIES: { [key: string]: string } = {
  top: '"top news" OR "breaking news" OR headlines',
  world: 'world OR global',
  business: 'business OR economy OR markets',
  technology: 'technology OR tech OR AI',
  science: 'science OR research',
  sports: 'sports OR football OR soccer OR basketball',
  entertainment: '"entertainment news" OR "celebrity" OR "movie" OR "film" OR "music" OR "TV show" OR "series" OR "concert" OR "album" OR "cinema" OR "actor" OR "actress"',
  health: 'health OR medicine OR wellness',
  politics: 'politics OR government OR election OR elections OR vote OR parliament OR congress OR senate OR coalition OR cabinet OR policy OR law OR referendum OR campaign',
  climate: 'climate OR environment OR emissions OR sustainability OR warming',
  crypto: 'crypto OR cryptocurrency OR bitcoin OR ethereum OR blockchain',
  energy: 'energy OR oil OR gas OR renewables OR solar OR wind OR nuclear',
  education: 'education OR school OR university OR students OR teachers',
  travel: 'travel OR tourism OR airline OR airport OR hotel',
  gaming: 'gaming OR video game OR esports OR playstation OR xbox OR nintendo',
  space: 'space OR NASA OR ESA OR SpaceX OR rocket OR satellite',
  security: 'security OR defense OR defence OR military OR conflict OR war'
};

// Additional filtering keywords for better category matching
export const CATEGORY_FILTERS: { [key: string]: string[] } = {
  entertainment: [
    'entertainment', 'celebrity', 'movie', 'film', 'music', 'album', 'song', 'artist', 'singer',
    'actor', 'actress', 'director', 'cinema', 'theatre', 'theater', 'concert', 'festival',
    'tv show', 'series', 'netflix', 'disney', 'hollywood', 'box office', 'premiere', 'awards',
    'grammy', 'oscar', 'emmy', 'golden globe', 'cannes', 'sundance', 'streaming', 'soundtrack'
  ],
  sports: [
    'sport', 'game', 'match', 'tournament', 'championship', 'league', 'team', 'player',
    'football', 'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'olympics', 'fifa'
  ],
  technology: [
    'technology', 'tech', 'ai', 'artificial intelligence', 'software', 'app', 'digital',
    'cyber', 'internet', 'computer', 'smartphone', 'robot', 'automation', 'startup'
  ],
  business: [
    'business', 'economy', 'market', 'stock', 'financial', 'company', 'corporation',
    'investment', 'trading', 'profit', 'revenue', 'gdp', 'inflation', 'banking'
  ],
  health: [
    'health', 'medical', 'medicine', 'hospital', 'doctor', 'patient', 'disease',
    'virus', 'vaccine', 'treatment', 'drug', 'pharmaceutical', 'wellness', 'fitness'
  ],
  science: [
    'science', 'research', 'study', 'discovery', 'experiment', 'scientist', 'laboratory',
    'climate', 'space', 'nasa', 'physics', 'chemistry', 'biology', 'environmental'
  ],
  politics: [
    'politics', 'government', 'election', 'vote', 'president', 'minister', 'parliament',
    'congress', 'senate', 'policy', 'law', 'legislation', 'political', 'campaign'
  ],
  climate: [
    'climate', 'environment', 'emissions', 'carbon', 'co2', 'warming', 'global warming',
    'sustainability', 'sustainable', 'renewable', 'green', 'net zero', 'cop', 'wildfire',
    'heatwave', 'flood', 'drought'
  ],
  crypto: [
    'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'token', 'defi', 'nft',
    'exchange', 'coinbase', 'binance', 'wallet', 'stablecoin', 'sec', 'etf'
  ],
  energy: [
    'energy', 'oil', 'gas', 'opec', 'renewables', 'solar', 'wind', 'nuclear', 'power',
    'grid', 'electricity', 'fuel', 'battery', 'pipeline'
  ],
  education: [
    'education', 'school', 'schools', 'university', 'college', 'students', 'teachers',
    'curriculum', 'exam', 'exams', 'tuition', 'scholarship'
  ],
  travel: [
    'travel', 'tourism', 'tourist', 'airline', 'flight', 'airport', 'hotel', 'visa', 'cruise',
    'booking'
  ],
  gaming: [
    'game', 'gaming', 'video game', 'videogame', 'esports', 'playstation', 'xbox', 'nintendo',
    'steam', 'developer', 'studio', 'publisher', 'console'
  ],
  space: [
    'space', 'nasa', 'esa', 'spacex', 'rocket', 'launch', 'satellite', 'mars', 'moon', 'lunar',
    'orbit', 'astronomy', 'telescope'
  ],
  security: [
    'security', 'defense', 'defence', 'military', 'conflict', 'war', 'nato', 'army', 'strike',
    'ceasefire', 'sanctions'
  ]
};

// Map our categories to Google News topic codes when available
export const TOPIC_MAP: { [key: string]: string } = {
  world: 'WORLD',
  business: 'BUSINESS',
  technology: 'TECHNOLOGY',
  science: 'SCIENCE',
  sports: 'SPORTS',
  entertainment: 'ENTERTAINMENT',
  health: 'HEALTH'
};

// When region is global, fetch across multiple GL markets to reduce US bias
export const GLOBAL_GLS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'IN', 'BR', 'MX', 'RU', 'CN', 'KR', 'PL', 'NL', 'SE', 'NO', 'FI', 'DK', 'IE', 'NZ', 'ZA', 'SG', 'HK', 'TW', 'TH', 'VN', 'PH', 'ID', 'MY', 'AE', 'SA', 'EG', 'IL', 'TR', 'UA', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT'];

// Lightweight sport type detection to diversify sports coverage
export const SPORT_TYPES: { [key: string]: string[] } = {
  american_football: ['nfl', 'american football', 'ncaaf', 'college football', 'super bowl', 'quarterback', 'touchdown'],
  soccer: ['soccer', 'football', 'premier league', 'la liga', 'serie a', 'bundesliga', 'champions league', 'uefa', 'fifa'],
  basketball: ['nba', 'basketball', 'euroleague'],
  baseball: ['mlb', 'baseball'],
  tennis: ['tennis', 'atp', 'wta', 'grand slam', 'wimbledon', 'us open', 'roland garros', 'australian open'],
  cricket: ['cricket', 'ipl', 'odi', 'test match', 't20'],
  motorsport: ['f1', 'formula 1', 'motogp', 'indycar', 'nascar'],
  rugby: ['rugby', 'six nations', 'rugby world cup'],
  golf: ['golf', 'pga', 'masters', 'open championship', 'ryder cup'],
  hockey: ['nhl', 'hockey', 'ice hockey'],
  boxing: ['boxing', 'fight', 'heavyweight', 'wbo', 'wbc', 'wba', 'ibf'],
  mma: ['ufc', 'mma', 'mixed martial arts'],
  athletics: ['athletics', 'track and field', 'diamond league', 'marathon'],
  cycling: ['cycling', 'tour de france', 'giro', 'vuelta'],
  winter: ['skiing', 'biathlon', 'snowboard', 'figure skating', 'speed skating'],
  olympics: ['olympics', 'olympic']
};