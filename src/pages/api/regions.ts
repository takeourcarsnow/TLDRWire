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