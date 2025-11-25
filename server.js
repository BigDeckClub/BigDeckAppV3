const DEFAULT_BLACKLIST = [
  'showcase','show case','show-case','alternate art','alternate','alt-art','alt art','alt',
  'extended art','extended-art','extended','borderless','border-less','border less',
  'artist','art series','art-series','variant','variant art','premium',
  'secret lair','secret-lair','promo','judge promo','judge','fnm','f.n.m','prerelease',
  'foil','etched','etched foil','super foil','super-foil','foil stamped','holo','hyperfoil',
  'collector','collector edition','collector-edition','oversized','oversized card',
  'special edition','special-edition','limited edition','limited-edition','retro frame',
  'retro','masterpiece','artist series'
];

const SET_CODE_CANDIDATE = /^[A-Z0-9]{2,5}$/;

function normalizeName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2013\u2014–—]/g, '-')
    .replace(/[^a-z0-9\-\(\)\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classifyVariant(rawName, cardName, options = {}) {
  const blacklist = options.blacklist || DEFAULT_BLACKLIST;
  const name = normalizeName(rawName);
  const target = normalizeName(cardName).trim();

  // If name exactly matches card name -> normal
  if (name === target) {
    return 'normal';
  }

  // If name is card name + set code in parentheses -> set
  // e.g. "lightning bolt (kld)", "sol ring (m21)"
  const parenMatch = rawName.match(/\(([^)]+)\)\s*$/);
  if (parenMatch && name.startsWith(target)) {
    const token = parenMatch[1].trim().toUpperCase();
    if (SET_CODE_CANDIDATE.test(token)) {
      const tokLower = token.toLowerCase();
      if (!blacklist.some(b => tokLower.includes(b))) {
        return 'set';
      }
    }
  }

  // Check for blacklisted keywords first
  for (const kw of blacklist) {
    if (name.includes(kw)) {
      if (kw.includes('foil') && kw.includes('etched')) return 'etched';
      if (kw.includes('etched')) return 'etched';
      if (kw.includes('foil')) return 'foil';
      if (kw.includes('promo') || kw.includes('judge') || kw.includes('fnm') || kw.includes('prerelease'))
        return 'promo';
      return 'special';
    }
  }

  // If name starts with card name but has extra descriptive content
  if (name.startsWith(target)) {
    const tail = name.slice(target.length).trim();
    if (tail.length > 0) {
      // Split on spaces and punctuation
      const tokens = tail.split(/[\s\-–—:()]+/).filter(Boolean);
      
      // If there are multiple tokens after card name, likely variant
      if (tokens.length >= 2) {
        return 'special';
      }
      
      // Single token after name: check if it's set code
      if (tokens.length === 1 && SET_CODE_CANDIDATE.test(tokens[0].toUpperCase())) {
        return 'set';
      }
      
      // Single word that looks like edition/variant -> special
      if (tokens.length === 1) {
        const word = tokens[0].toLowerCase();
        if (word && word.length > 0 && !word.match(/^[0-9]+$/)) {
          // Non-numeric single word after card name is suspicious
          return 'special';
        }
      }
    }
  }

  // If name includes card name anywhere and no red flags -> normal
  if (name.includes(target)) {
    return 'normal';
  }

  return 'premium';
}

module.exports = { classifyVariant, normalizeName };
