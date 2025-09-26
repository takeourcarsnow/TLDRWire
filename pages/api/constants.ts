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
  culture: 'culture OR arts OR "visual art" OR literature OR books OR exhibition OR gallery OR theater OR theatre OR opera OR ballet OR museum OR heritage OR columnist OR critic OR review OR cultural',
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
  culture: [
    'culture', 'arts', 'art', 'literature', 'book', 'books', 'gallery', 'museum', 'exhibition',
    'theatre', 'theater', 'opera', 'ballet', 'critic', 'review', 'heritage', 'cultural'
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
  culture: 'ENTERTAINMENT',
  health: 'HEALTH'
};

// When region is global, fetch across multiple GL markets to reduce US bias
export const GLOBAL_GLS = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'IN', 'BR', 'MX', 'RU', 'CN', 'KR', 'PL', 'NL', 'SE', 'NO', 'FI', 'DK', 'IE', 'NZ', 'ZA', 'SG', 'HK', 'TW', 'TH', 'VN', 'PH', 'ID', 'MY', 'AE', 'SA', 'EG', 'IL', 'TR', 'UA', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT'];

// Fallback public RSS feeds from major publishers. These are used when
// Google News RSS results are unavailable or failing from the server.
// Keep the list conservative (stable, well-known URLs). We map by
// category where possible; each entry is an array of RSS feed URLs.
export const FALLBACK_FEEDS: { [key: string]: string[] } = {
  top: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.reuters.com/world/rss.xml'
  ],
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.reuters.com/world/rss.xml',
    'https://feeds.npr.org/1004/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.dw.com/en/top-stories/rss.xml',
    'https://www.spiegel.de/international/rss.xml',
    'https://www.zeit.de/index.rss',
    'https://www.tagesschau.de/xml/rss2/',
    'https://rss.cnn.com/rss/edition_world.rss',
    'https://feeds.foxnews.com/foxnews/world'
  ],
  technology: [
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://www.theguardian.com/technology/rss'
  ],
  business: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://www.theguardian.com/business/rss'
  ],
  science: [
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://www.theguardian.com/science/rss'
  ],
  sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml?edition=uk',
    'https://www.theguardian.com/uk/sport/rss'
  ]
  ,
  // Culture-specific fallback feeds (arts, culture, reviews)
  culture: [
    'https://www.theguardian.com/culture/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'
  ],
  // Lithuania-specific fallback feeds (general/top Lithuanian outlets)
  lithuania: [
    'https://www.lrt.lt/rss',
    'https://www.delfi.lt/rss.xml',
    'https://www.15min.lt/rss',
    'https://www.lrytas.lt/rss'
  ]
  ,
  // India-specific fallback feeds (major publishers / business sections)
  india: [
    'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    'https://indianexpress.com/section/business/feed/',
    'https://www.livemint.com/rss/news',
    'https://www.ndtv.com/rss',
    'https://www.thehindu.com/rss/'
  ],
  // United States-specific fallback feeds
  'united-states': [
    'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
    'https://www.theguardian.com/us-news/rss',
    'https://rss.cnn.com/rss/edition_us.rss',
    'https://feeds.foxnews.com/foxnews/national'
  ],
  // United Kingdom-specific fallback feeds
  'united-kingdom': [
    'https://feeds.bbci.co.uk/news/uk/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', // NYT has UK coverage
    'https://www.theguardian.com/uk-news/rss',
    'https://www.telegraph.co.uk/rss.xml',
    'https://www.independent.co.uk/rss'
  ],
  // Germany-specific fallback feeds
  germany: [
    'https://www.spiegel.de/international/rss.xml',
    'https://www.zeit.de/index.rss',
    'https://www.faz.net/rss/aktuell/',
    'https://www.dw.com/en/top-stories/rss.xml',
    'https://www.tagesschau.de/xml/rss2/'
  ],
  // France-specific fallback feeds
  france: [
    'https://www.lemonde.fr/rss/en_continu.xml',
    'https://www.lefigaro.fr/rss/figaro_actualites.xml',
    'https://www.liberation.fr/rss/',
    'https://www.france24.com/en/rss'
  ],
  // Japan-specific fallback feeds
  japan: [
    'https://www.nhk.or.jp/rss/news/cat0.xml',
    'https://www.asahi.com/rss/asahi/newsheadlines.rdf',
    'https://www.japantimes.co.jp/feed/',
    'https://www.yomiuri.co.jp/rss/portal.xml'
  ],
  // Brazil-specific fallback feeds
  brazil: [
    'https://g1.globo.com/rss/g1/',
    'https://www.folha.uol.com.br/rss/',
    'https://www.estadao.com.br/rss/',
    'https://www.bbc.com/portuguese/rss.xml' // BBC Portuguese for Brazil
  ],
  // Australia-specific fallback feeds
  australia: [
    'https://www.abc.net.au/news/feed/51120/rss.xml',
    'https://www.smh.com.au/rss/feed.xml',
    'https://www.theage.com.au/rss/feed.xml',
    'https://www.news.com.au/rss'
  ]
};

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