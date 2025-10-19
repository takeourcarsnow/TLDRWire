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