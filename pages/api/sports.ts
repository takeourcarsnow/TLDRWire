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
export default (_req: any, res: any) => res.status(404).end();
