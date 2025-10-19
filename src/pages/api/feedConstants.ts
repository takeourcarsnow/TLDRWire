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
  health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
    'https://www.theguardian.com/society/health/rss',
    'https://www.reuters.com/news/archive/health/rss.xml',
    'https://www.statnews.com/feed/',
    'https://www.healthnewsreview.org/feed/',
    'https://www.kff.org/feed/'
  ],
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