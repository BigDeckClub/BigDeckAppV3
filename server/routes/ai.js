import express from 'express';
import { authenticate } from '../middleware/index.js';
import OpenAI from 'openai';
import { pool } from '../db/pool.js';
import { mtgjsonService } from '../mtgjsonPriceService.js';

const router = express.Router();

// Lazy Initialize OpenAI
let openai = null;
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Debug route
router.get('/ping', (req, res) => {
  res.json({ message: 'Pong from AI router (OpenAI)', openai_key_set: !!process.env.OPENAI_API_KEY });
});

console.log('[AI] Router loaded (OpenAI)');

// Helper: Get MTGGoldfish popular cards for a Commander
async function getMtgGoldfishData(commanderName) {
  try {
    // Convert "Fire Lord Zuko" to "commander-fire-lord-zuko"
    const slug = 'commander-' + commanderName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const url = `https://www.mtggoldfish.com/archetype/${slug}`;
    console.log(`[AI] Fetching MTGGoldfish: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`[AI] MTGGoldfish returned ${response.status}, skipping`);
      return null;
    }

    const html = await response.text();

    // Extract card names from the HTML using regex
    // Cards are in links like: /price/Set+Name/Card+Name
    const cardMatches = html.matchAll(/\/price\/[^"]+\/([A-Za-z0-9+\-']+)"/g);
    const cardNames = new Set();

    for (const match of cardMatches) {
      // Decode the card name (+ becomes space, etc.)
      const cardName = decodeURIComponent(match[1].replace(/\+/g, ' '));
      // Skip sets and other non-cards
      if (cardName.length > 2 && !cardName.includes('Promo') && !cardName.includes('Commander')) {
        cardNames.add(cardName);
      }
    }

    // Also extract percentage-based info
    const popularCards = Array.from(cardNames).slice(0, 50);

    console.log(`[AI] MTGGoldfish found ${popularCards.length} unique cards`);
    return { popularCards };
  } catch (err) {
    console.error('[AI] MTGGoldfish fetch failed:', err.message);
    return null;
  }
}


// Helper: Get Commander Details from Scryfall
async function getCommanderDetails(query) {
  try {
    // Try exact first
    let response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query)}`);
    if (response.ok) return await response.json();

    // Try fuzzy
    response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`);
    if (response.ok) {
      return await response.json();
    }

    // Try search (for partial names or nicknames)
    response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=edhrec`);
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        console.log(`[AI] Scryfall search found: ${data.data[0].name}`);
        return data.data[0];
      }
    }

    return null;
  } catch (err) {
    console.error('Scryfall lookup failed:', err);
    return null;
  }
}

// Helper: Get relevant inventory
async function getInventoryForDeck(userId) {
  const query = `
    SELECT name, quantity, image_url 
    FROM inventory 
    WHERE user_id = $1 
    ORDER BY purchase_price DESC NULLS LAST 
    LIMIT 300
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper: Get EDHREC recommendations for a Commander
async function getEdhrecRecommendations(commanderName, budgetType = null) {
  try {
    // Convert "Atraxa, Praetors' Voice" to "atraxa-praetors-voice"
    const slug = commanderName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    let url = `https://json.edhrec.com/pages/commanders/${slug}.json`;
    if (budgetType === 'budget' || budgetType === 'expensive') {
      url = `https://json.edhrec.com/pages/commanders/${slug}/${budgetType}.json`;
    }

    console.log(`[AI] Fetching EDHREC data (${budgetType || 'standard'}): ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.log(`[AI] EDHREC (${budgetType || 'standard'}) returned ${response.status}, skipping...`);
      return null;
    }

    const data = await response.json();
    const cardLists = data?.container?.cardlists || [];

    // Extract archetypes/themes from panels taglinks
    const taglinks = data?.panels?.taglinks || [];
    const archetypes = taglinks.slice(0, 10).map(t => t.value);

    // Extract combos from panels
    const comboCounts = data?.panels?.combocounts || [];
    const combos = comboCounts
      .filter(c => c.value && !c.value.includes('See More'))
      .slice(0, 10)
      .map(c => c.value);

    // Extract MORE cards from each category (15-20 per category for better coverage)
    const recommendations = {
      archetypes: archetypes,
      combos: combos,  // Popular combos with this commander
      highSynergy: [],
      topCards: [],
      gameChangers: [],  // Expensive staples
      newCards: [],      // Recent releases
      creatures: [],
      instants: [],
      sorceries: [],
      utilityArtifacts: [],
      manaArtifacts: [],
      enchantments: [],
      planeswalkers: [],
      utilityLands: [],
      lands: []
    };

    cardLists.forEach(list => {
      const cards = (list.cardviews || []).slice(0, 20).map(c => c.name);
      switch (list.tag) {
        case 'highsynergycards': recommendations.highSynergy = cards; break;
        case 'topcards': recommendations.topCards = cards; break;
        case 'gamechangers': recommendations.gameChangers = cards; break;
        case 'newcards': recommendations.newCards = cards; break;
        case 'creatures': recommendations.creatures = cards; break;
        case 'instants': recommendations.instants = cards; break;
        case 'sorceries': recommendations.sorceries = cards; break;
        case 'utilityartifacts': recommendations.utilityArtifacts = cards; break;
        case 'manaartifacts': recommendations.manaArtifacts = cards; break;
        case 'enchantments': recommendations.enchantments = cards; break;
        case 'planeswalkers': recommendations.planeswalkers = cards; break;
        case 'utilitylands': recommendations.utilityLands = cards; break;
        case 'lands': recommendations.lands = cards; break;
      }
    });

    console.log(`[AI] EDHREC found: ${combos.length} combos, archetypes=[${archetypes.slice(0, 3).join(', ')}...], ${recommendations.highSynergy.length} high-synergy`);

    return recommendations;
  } catch (err) {
    console.error('[AI] EDHREC fetch failed:', err.message);
    return null;
  }
}

router.post('/generate', authenticate, async (req, res) => {
  console.log('[AI] (OpenAI) /generate endpoint hit!');

  const { commander: userPrompt, theme, budget, bracket } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const api = getOpenAI();

    // 1. Identify Commander
    let commanderName = userPrompt;
    let strategyHint = theme || '';

    // Robust extraction: If prompt clearly isn't just a name, or is long
    const needsExtraction = userPrompt.length > 20 || /build|make|create|deck|commander|based on|theme/i.test(userPrompt);

    if (needsExtraction) {
      console.log(`[AI] Extracting commander from: "${userPrompt}"`);
      const completion = await api.chat.completions.create({
        messages: [{
          role: "user", content: `Identify the Magic: The Gathering Commander card name from this prompt.
If it's a nickname (e.g., "Sad Robot"), return the real card name (e.g., "Solemn Simulacrum").
If it helps, "Goose Mother" is "The Goose Mother".
Return ONLY the exact card name.

Prompt: ${userPrompt}`
        }],
        model: "gpt-4o",
      });
      commanderName = completion.choices[0].message.content.trim();
      console.log(`[AI] Extracted Name: "${commanderName}"`);
      strategyHint = userPrompt;
    } else {
      console.log(`[AI] Using provided name directly: "${commanderName}"`);
    }

    // 2. Get Commander Details (Scryfall)
    const commanderCard = await getCommanderDetails(commanderName);
    if (!commanderCard) {
      return res.status(404).json({ error: `Could not identify a valid commander from "${commanderName}"` });
    }

    const colorId = commanderCard.color_identity || [];
    const colorString = colorId.length > 0 ? colorId.join('') : 'Colorless';
    const keywords = commanderCard.keywords || [];
    const keywordsString = keywords.length > 0 ? keywords.join(', ') : 'None';

    console.log(`[AI] Commander: ${commanderCard.name}, Colors: ${colorString}, Keywords: ${keywordsString}`);

    // 3. Get User Inventory Context
    const inventory = await getInventoryForDeck(req.userId);
    const inventoryList = inventory.map(c => c.name).join(', ');

    // 4. Get EDHREC Recommendations (real data!)
    let edhrecType = null;
    if (budget && budget <= 250) edhrecType = 'budget';
    else if (budget && budget >= 1000) edhrecType = 'expensive';

    // Fetch both standard and budget/expensive in parallel for a richer filler pool
    const [edhrecDefault, edhrecSpecific] = await Promise.all([
      getEdhrecRecommendations(commanderCard.name, null),
      edhrecType ? getEdhrecRecommendations(commanderCard.name, edhrecType) : Promise.resolve(null)
    ]);

    // Primary edhrec for the prompt is Specific, fallback to Default
    const edhrec = edhrecSpecific || edhrecDefault;

    // 5. Get MTGGoldfish popular cards
    const goldfish = await getMtgGoldfishData(commanderCard.name);

    let edhrecContext = '';
    if (edhrec) {
      const budgetTitle = edhrecType === 'budget' ? 'LOW BUDGET' : (edhrecType === 'expensive' ? 'EXPENSIVE/OPTIMIZED' : 'STANDARD');
      edhrecContext = `
**EDHREC ${budgetTitle} RECOMMENDATIONS - USE THESE CARDS! (Specifically curated for ${budgetTitle} builds):**

DECK ARCHETYPES/THEMES: ${edhrec.archetypes.join(', ')}
(Build around these themes for maximum synergy!)

POPULAR COMBOS (Include cards from these combos if possible):
${edhrec.combos.length > 0 ? edhrec.combos.join('\n') : 'No specific combos listed'}

HIGH SYNERGY (MUST INCLUDE MANY OF THESE):
${edhrec.highSynergy.join(', ')}

TOP CARDS (STAPLES):
${edhrec.topCards.join(', ')}

GAME CHANGERS (EXPENSIVE/POWERFUL - include if budget allows):
${edhrec.gameChangers.join(', ')}

NEW/RECENT CARDS (Fresh options):
${edhrec.newCards.join(', ')}

CREATURES (Pick 20-25):
${edhrec.creatures.join(', ')}

INSTANTS (Pick 8-12):
${edhrec.instants.join(', ')}

SORCERIES (Pick 6-10):
${edhrec.sorceries.join(', ')}

UTILITY ARTIFACTS (Pick 5-8):
${edhrec.utilityArtifacts.join(', ')}

MANA ROCKS (Pick 8-10):
${edhrec.manaArtifacts.join(', ')}

ENCHANTMENTS (Pick 5-8):
${edhrec.enchantments.join(', ')}

PLANESWALKERS (Pick 0-3):
${edhrec.planeswalkers.join(', ')}

UTILITY LANDS (Pick 5-8):
${edhrec.utilityLands.join(', ')}

LANDS (Pick ~35 total including basics):
${edhrec.lands.slice(0, 15).join(', ')}
`;
      console.log('[AI] EDHREC data injected into prompt (expanded with archetypes)');
    }

    // Add MTGGoldfish data if available
    let goldfishContext = '';
    if (goldfish && goldfish.popularCards.length > 0) {
      goldfishContext = `

**MTGGOLDFISH POPULAR CARDS (From real player-submitted decks):**
${goldfish.popularCards.slice(0, 40).join(', ')}

`;
      console.log('[AI] MTGGoldfish data injected into prompt');
    }

    // Combine contexts
    const combinedContext = edhrecContext + goldfishContext + `
**IMPORTANT: Build the deck primarily from the EDHREC and MTGGoldfish cards listed above! Only use cards NOT in these lists if absolutely necessary.**
`;

    // 4. PREPARE 3-PASS GENERATION
    console.log(`[AI] Starting 3-Pass Generation for ${commanderCard.name}...`);

    // --- PASS 1: THE SOUL (Description & Theme) ---
    const soulPrompt = `You are a Grandmaster MTG Deck Builder. 
Commander: ${commanderCard.name}
Colors: ${colorString}
Keywords: ${keywordsString}
Target Budget: $${budget || 'No limit'}
Target Power Bracket: ${bracket || 'Standard'}
User Request: ${strategyHint}
Archetypes: ${edhrec?.archetypes.join(', ')}

Task: Generate a brief strategy description (1-2 sentences) and 3 core themes for this deck.
Format: JSON { "description": "...", "themes": ["theme1", "theme2", "theme3"] }`;

    // --- PASS 2: THE HEART (34 Synergy Cards) ---
    // Calculate per-card budget guidance
    let budgetGuidance = '';
    if (budget) {
      const avgCardBudget = (budget * 0.7) / 64; // 70% of budget for 64 spells
      let maxSingleCard = Math.min(avgCardBudget * 4, budget * 0.15); // Max single card is 4x avg or 15% of total
      if (budget <= 100) {
        budgetGuidance = `STRICT BUDGET: $${budget} total. Max $3 per card. NO expensive staples. Use budget alternatives (e.g., Llanowar Elves over Birds of Paradise, Swords to Plowshares over Path to Exile alternatives).`;
      } else if (budget <= 300) {
        budgetGuidance = `BUDGET: $${budget} total. Average $3-5 per card, max $10 for key pieces. Prefer budget-friendly options. Avoid cards over $10.`;
      } else if (budget <= 600) {
        budgetGuidance = `MODERATE BUDGET: $${budget} total. Average $5-10 per card, max $20 for key pieces. Can include some mid-range staples.`;
      } else if (budget <= 1000) {
        budgetGuidance = `GOOD BUDGET: $${budget} total. Average $10-15 per card, max $40 for key pieces. Include quality staples.`;
      } else {
        budgetGuidance = `HIGH BUDGET: $${budget}+ total. Include premium staples and expensive cards. Optimize for power.`;
      }
    }

    const heartPrompt = `You are a Grandmaster MTG Deck Builder.
Commander: ${commanderCard.name}
${budgetGuidance}
Themes: [[THEMES]]
Strategy: [[DESCRIPTION]]

Task: Generate EXACTLY 34 high-synergy non-land cards that form the core of this deck.
STRICT RULES:
1. NO LANDS.
2. NO MANA ROCKS (Wait for Pass 3).
3. NO GENERIC DRAW/REMOVAL (Wait for Pass 3).
4. FOCUS ONLY ON SYNERGY WITH ${commanderCard.name}.
5. ${budgetGuidance || 'No budget limit - optimize for power.'}
6. Inventory First: ${inventoryList}
7. Context: ${combinedContext}

Format: JSON { "cards": [{ "name": "Card Name", "category": "Synergy", "quantity": 1 }] } (Exactly 34 cards)`;

    // --- PASS 3: THE ENGINE (30 Staples) ---
    const enginePrompt = `You are a Grandmaster MTG Deck Builder.
Commander: ${commanderCard.name}
${budgetGuidance}
Strategy: [[DESCRIPTION]]

Task: Generate EXACTLY 30 non-land staple cards to power the deck's engine.
STRICT BREAKDOWN: 
- 10 Ramp Cards (Artifacts/Green spells if in color identity)
- 10 Draw Cards
- 10 Removal Cards (Single target/Board wipes)

STRICT RULES:
1. NO LANDS.
2. NO SYNERGY CARDS (Wait for Pass 2).
3. ${budgetGuidance || 'No budget limit - optimize for power.'}
4. Inventory First: ${inventoryList}
5. Context: ${combinedContext}

Format: JSON { "cards": [{ "name": "Card Name", "category": "Ramp/Draw/Removal", "quantity": 1 }] } (Exactly 30 cards)`;

    // 5. EXECUTE PASSES (In Parallel where possible)
    // First, get the Soul to inform the other passes
    const soulCompletion = await api.chat.completions.create({
      messages: [{ role: "system", content: "Expert MTG Deck Advisor" }, { role: "user", content: soulPrompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });
    const soulData = JSON.parse(soulCompletion.choices[0].message.content);
    console.log(`[AI] Pass 1 (Soul) Complete: ${soulData.description}`);

    // Inform Heart and Engine with Soul's output
    const heartPromptFinal = heartPrompt.replace('[[THEMES]]', soulData.themes.join(', ')).replace('[[DESCRIPTION]]', soulData.description);
    const enginePromptFinal = enginePrompt.replace('[[DESCRIPTION]]', soulData.description);

    const [heartCompletion, engineCompletion] = await Promise.all([
      api.chat.completions.create({
        messages: [{ role: "system", content: "Expert MTG Synergy Architect" }, { role: "user", content: heartPromptFinal }],
        model: "gpt-4o",
        response_format: { type: "json_object" }
      }),
      api.chat.completions.create({
        messages: [{ role: "system", content: "Expert MTG Staples Optimizer" }, { role: "user", content: enginePromptFinal }],
        model: "gpt-4o",
        response_format: { type: "json_object" }
      })
    ]);

    const heartData = JSON.parse(heartCompletion.choices[0].message.content);
    const engineData = JSON.parse(engineCompletion.choices[0].message.content);

    console.log(`[AI] Pass 2 (Heart) generated ${heartData.cards?.length || 0} synergy cards.`);
    console.log(`[AI] Pass 3 (Engine) generated ${engineData.cards?.length || 0} staples.`);

    // 6. Post-Processing: Assemble the full 100-card deck
    const targetTotal = 100;
    const targetSpells = 64;
    const targetLands = 36;

    // Combine all spells and STRICTLY deduplicate by name (Singleton rule)
    const rawSpells = [
      { name: commanderCard.name, quantity: 1, category: 'Commander' },
      ...(heartData.cards || []),
      ...(engineData.cards || [])
    ];

    const seenNames = new Set();
    let allSpells = [];

    rawSpells.forEach(card => {
      const normalized = card.name.toLowerCase().trim();
      if (!seenNames.has(normalized)) {
        seenNames.add(normalized);
        allSpells.push(card);
      }
    });

    // Filter out ANY cards categorized as Land or matching basic names
    const basicLandNames = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'];
    allSpells = allSpells.filter(c =>
      c.category?.toLowerCase() !== 'land' &&
      !basicLandNames.includes(c.name)
    );

    let currentSpells = allSpells.reduce((sum, card) => sum + (card.quantity || 1), 0);
    console.log(`[AI] Total merged unique non-land spells: ${currentSpells}`);

    // STEP A: Force Spell count to exactly 64
    // Helper to check color identity validity
    const commanderColors = new Set(colorId);
    const isValidColorIdentity = async (cardName) => {
      // Colorless cards (artifacts, etc) are always valid
      // For now, we'll validate during Scryfall enrichment and skip validation during filling
      // to avoid API calls for each filler card
      return true; // We'll filter invalid cards during enrichment
    };

    if (currentSpells < targetSpells) {
      console.log(`[AI] Filling spells to 64... (need ${targetSpells - currentSpells} more)`);
      const fillSources = [
        ...(edhrecSpecific?.highSynergy || []),
        ...(edhrecSpecific?.topCards || []),
        ...(goldfish?.popularCards || []),
        ...(edhrecDefault?.highSynergy || []),
        ...(edhrecDefault?.topCards || []),
        ...(edhrecSpecific?.creatures || []),
        ...(edhrecDefault?.creatures || []),
        ...(edhrecSpecific?.instants || []),
        ...(edhrecDefault?.instants || []),
        ...(edhrecSpecific?.sorceries || []),
        ...(edhrecDefault?.sorceries || []),
        ...(edhrecSpecific?.utilityArtifacts || []),
        ...(edhrecDefault?.utilityArtifacts || []),
        ...(edhrecSpecific?.enchantments || []),
        ...(edhrecDefault?.enchantments || []),
        ...(edhrecSpecific?.manaArtifacts || []),
        ...(edhrecDefault?.manaArtifacts || [])
      ];

      console.log(`[AI] Fill sources available: ${fillSources.length} cards`);

      for (const cardName of fillSources) {
        if (currentSpells >= targetSpells) break;
        const normalized = cardName.toLowerCase().trim();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          allSpells.push({ name: cardName, quantity: 1, category: 'Synergy', reason: 'Auto-filler synergy' });
          currentSpells++;
        }
      }
    } else if (currentSpells > targetSpells) {
      console.log(`[AI] Cutting spells to 64...`);
      for (let i = allSpells.length - 1; i >= 0 && currentSpells > targetSpells; i--) {
        if (allSpells[i].category === 'Commander') continue;
        const toCut = Math.min(allSpells[i].quantity, currentSpells - targetSpells);
        allSpells[i].quantity -= toCut;
        currentSpells -= toCut;
        if (allSpells[i].quantity <= 0) {
          allSpells.splice(i, 1);
        }
      }
    }

    // STEP B: Force Land count to exactly 36 (Max 26 Non-Basics + Basics)
    let currentLands = 0;
    const finalLandList = [];
    const seenLandNames = new Set();
    const recLands = [
      ...(edhrecSpecific?.utilityLands || []),
      ...(edhrecSpecific?.lands || []),
      ...(edhrecDefault?.utilityLands || []),
      ...(edhrecDefault?.lands || [])
    ];

    for (const landName of recLands) {
      if (currentLands >= 26) break;
      const normalized = landName.toLowerCase().trim();
      if (!seenLandNames.has(normalized) && !basicLandNames.includes(landName)) {
        seenLandNames.add(normalized);
        finalLandList.push({ name: landName, quantity: 1, category: 'Land', reason: 'Recommended Land' });
        currentLands++;
      }
    }

    const landsRemaining = targetLands - currentLands;
    if (landsRemaining > 0) {
      const basics = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest', 'C': 'Wastes' };
      const colors = commanderCard.color_identity || [];
      if (colors.length === 0) colors.push('C');

      const landsPerColor = Math.floor(landsRemaining / colors.length);
      let remainder = landsRemaining % colors.length;

      colors.forEach(color => {
        const landName = basics[color] || 'Wastes';
        const qty = landsPerColor + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        if (qty > 0) {
          const existing = finalLandList.find(l => l.name === landName);
          if (existing) {
            existing.quantity += qty;
          } else {
            finalLandList.push({ name: landName, quantity: qty, category: 'Land', reason: 'Basic Land' });
          }
          currentLands += qty;
        }
      });
    }

    const deckData = {
      description: soulData.description,
      cards: [...allSpells, ...finalLandList]
    };

    console.log(`[AI] Final Assembly: ${allSpells.length} Spells, ${finalLandList.length} Lands.`);
    console.log(`[AI] Final Deck Count: ${deckData.cards.reduce((s, c) => s + (c.quantity || 1), 0)} (target: 100)`);



    // 7. Enrich cards with Scryfall metadata (cmc, colors, type, prices)
    try {
      const cardNames = [...new Set(deckData.cards.map(c => c.name))];
      const cardMap = new Map();

      // Scryfall limit: 75 per request. Decks have ~65 unique names (100 total cards).
      // We chunk just in case the AI generated many unique names.
      for (let i = 0; i < cardNames.length; i += 75) {
        const chunk = cardNames.slice(i, i + 75);
        const identifiers = chunk.map(name => ({ name }));

        const scryfallRes = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers })
        });

        if (scryfallRes.ok) {
          const scryfallData = await scryfallRes.json();
          (scryfallData.data || []).forEach(card => {
            const prices = mtgjsonService.getPricesByScryfallId(card.id);

            // Parse Scryfall prices (they come as strings like "1.23")
            const scryfallUsdPrice = card.prices?.usd ? parseFloat(card.prices.usd) : 0;

            // Use MTGJSON prices if available, fallback to Scryfall
            const tcgPrice = prices.tcgplayer || scryfallUsdPrice || 0;
            const ckPrice = prices.cardkingdom || 0;

            cardMap.set(card.name.toLowerCase(), {
              scryfallId: card.id,
              cmc: card.cmc || 0,
              colors: (card.colors || []).join(''),
              colorIdentity: card.color_identity || [],
              cardType: card.type_line?.split('—')[0]?.trim() || 'Unknown',
              tcgPrice: tcgPrice,
              ckPrice: ckPrice
            });
          });
        }
      }

      // Filter out cards that violate commander color identity
      const commanderColorSet = new Set(colorId);
      let removedForColorIdentity = 0;

      deckData.cards = deckData.cards.filter(card => {
        // Skip validation for commander and lands
        if (card.category === 'Commander' || card.category === 'Land') return true;

        const meta = cardMap.get(card.name.toLowerCase());
        if (!meta) return true; // Keep cards we couldn't validate

        // Check if all colors in the card's color identity are in the commander's
        const cardColorIdentity = meta.colorIdentity || [];
        const isValid = cardColorIdentity.every(color => commanderColorSet.has(color) || commanderColorSet.size === 0);

        if (!isValid) {
          removedForColorIdentity++;
          console.log(`[AI] Removed ${card.name} - color identity [${cardColorIdentity.join(',')}] violates commander colors [${colorId.join(',')}]`);
        }
        return isValid;
      });

      if (removedForColorIdentity > 0) {
        console.log(`[AI] Removed ${removedForColorIdentity} cards for color identity violations`);
      }

      // Apply metadata to remaining deck cards
      deckData.cards.forEach(card => {
        const meta = cardMap.get(card.name.toLowerCase());
        if (meta) {
          card.scryfallId = meta.scryfallId;
          card.cmc = meta.cmc;
          card.colors = meta.colors;
          card.cardType = meta.cardType;
          card.tcgPrice = meta.tcgPrice;
          card.ckPrice = meta.ckPrice;
        }
      });

      // ========== VALIDATION & ITERATION LOOP ==========
      const maxCardPrice = budget ? (budget * 0.7 / 64) * 3 : Infinity; // Max single card = 3x average
      let validationIterations = 0;
      const maxValidationIterations = 10; // Increased to allow more aggressive budget cuts

      while (validationIterations < maxValidationIterations) {
        validationIterations++;

        // Calculate current totals
        const spellCards = deckData.cards.filter(c => c.category !== 'Land');
        const landCards = deckData.cards.filter(c => c.category === 'Land');
        const totalCards = deckData.cards.reduce((s, c) => s + Number(c.quantity || 1), 0);
        const totalPrice = deckData.cards.reduce((s, c) => s + ((c.tcgPrice || 0) * Number(c.quantity || 1)), 0);

        console.log(`[AI] Validation #${validationIterations}: ${totalCards} cards, $${totalPrice.toFixed(2)} total`);

        // Check if we're within constraints
        const budgetOk = !budget || totalPrice <= budget * 1.15; // 15% tolerance
        const countOk = totalCards === 100;

        if (budgetOk && countOk) {
          console.log(`[AI] Deck passes validation!`);
          break;
        }

        // OPTION 2: Price-aware - Remove expensive cards if over budget
        if (!budgetOk && budget) {
          console.log(`[AI] Over budget ($${totalPrice.toFixed(2)} > $${budget}), removing expensive cards...`);

          // Sort non-commander spells by price descending
          const expensiveCards = spellCards
            .filter(c => c.category !== 'Commander' && c.tcgPrice > maxCardPrice)
            .sort((a, b) => (b.tcgPrice || 0) - (a.tcgPrice || 0));

          // Remove up to 10 expensive cards per iteration (increased from 5)
          let removed = 0;
          for (const card of expensiveCards) {
            if (removed >= 10) break;
            const idx = deckData.cards.findIndex(c => c.name === card.name);
            if (idx !== -1) {
              console.log(`[AI] Removing expensive card: ${card.name} ($${card.tcgPrice})`);
              deckData.cards.splice(idx, 1);
              removed++;
            }
          }
        }

        // Handle Card Count
        const currentTotal = deckData.cards.reduce((s, c) => s + Number(c.quantity || 1), 0);

        // Case A: Too many cards (rare, but possible)
        if (currentTotal > 100) {
          const toRemove = currentTotal - 100;
          console.log(`[AI] Creating space: Removing ${toRemove} cheapest/weakest cards...`);
          // Remove cheapest non-synergy/non-land cards first
          const candidates = deckData.cards
            .filter(c => c.category !== 'Land' && c.category !== 'Commander' && c.category !== 'Synergy')
            .sort((a, b) => (a.tcgPrice || 0) - (b.tcgPrice || 0));

          let cut = 0;
          for (const card of candidates) {
            if (cut >= toRemove) break;
            const idx = deckData.cards.findIndex(c => c.name === card.name);
            if (idx !== -1) {
              deckData.cards.splice(idx, 1);
              cut++;
            }
          }
        }

        // Case B: Too few cards (Fill holes)
        const cardsNeeded = 100 - deckData.cards.reduce((s, c) => s + Number(c.quantity || 1), 0);
        if (cardsNeeded > 0) {
          console.log(`[AI] Need ${cardsNeeded} more cards, adding emergency fillers...`);

          // Colorless artifacts that work in any deck (Huge list to prevent dupes)
          const emergencyFillers = [
            'Sol Ring', 'Arcane Signet', 'Mind Stone', 'Thought Vessel',
            'Commander\'s Sphere', 'Fellwar Stone', 'Wayfarer\'s Bauble',
            'Swiftfoot Boots', 'Lightning Greaves', 'Whispersilk Cloak',
            'Skullclamp', 'Mask of Memory', 'Rogue\'s Gloves',
            'Hedron Archive', 'Worn Powerstone', 'Thran Dynamo',
            'Everflowing Chalice', 'Prismatic Lens', 'Star Compass',
            'Coldsteel Heart', 'Sky Diamond', 'Fire Diamond', 'Moss Diamond',
            'Marble Diamond', 'Charcoal Diamond', 'Guardian Idol',
            'Burnished Hart', 'Solemn Simulacrum', 'Pilgrim\'s Eye',
            'Palladium Myr', 'Plague Myr', 'Silver Myr', 'Gold Myr',
            'Iron Myr', 'Copper Myr', 'Leaden Myr', 'Alloy Myr',
            'Manakin', 'Millikin', 'Ornithopter. of Paradise',
            'Prophetic Prism', 'Network Terminal', 'Letter of Acceptance',
            'Spare Supplies', 'Ecologist\'s Terrarium', 'Traveler\'s Amulet',
            'Renegade Map', 'Expedition Map', 'Soul-Guide Lantern',
            'Relic of Progenitus', 'Tormod\'s Crypt', 'Scrabbling Claws',
            'Claws of Gix', 'Dragon\'s Claw', 'Wurmskin Forger',
            'Bonesplitter', 'Short Sword', 'Darksteel Axe', 'Accorder\'s Shield',
            'Cathar\'s Shield', 'Kite Shield', 'Spidersilk Net'
          ];

          const seenFillers = new Set(deckData.cards.map(c => c.name.toLowerCase()));
          let added = 0;

          for (const filler of emergencyFillers) {
            if (added >= cardsNeeded) break;
            if (!seenFillers.has(filler.toLowerCase())) {
              seenFillers.add(filler.toLowerCase());
              deckData.cards.push({
                name: filler,
                quantity: 1,
                category: 'Ramp',
                reason: 'Emergency filler'
              });
              added++;
            }
          }
          console.log(`[AI] Added ${added} emergency fillers`);
        }
      }

      // Final count verification
      const finalTotal = deckData.cards.reduce((s, c) => s + (c.quantity || 1), 0);
      const finalPrice = deckData.cards.reduce((s, c) => s + ((c.tcgPrice || 0) * (c.quantity || 1)), 0);
      console.log(`[AI] Final deck: ${finalTotal} cards, $${finalPrice.toFixed(2)} TCG Market`);

      // Log price stats for debugging
      let cardsWithCkPrice = 0, cardsWithTcgPrice = 0;
      deckData.cards.forEach(card => {
        if (card.ckPrice && card.ckPrice > 0) cardsWithCkPrice++;
        if (card.tcgPrice && card.tcgPrice > 0) cardsWithTcgPrice++;
      });
      console.log(`[AI] Price coverage: ${cardsWithTcgPrice}/${deckData.cards.length} TCG, ${cardsWithCkPrice}/${deckData.cards.length} CK`);

      console.log(`[AI] Enriched ${cardMap.size} unique cards with Scryfall metadata and prices`);
    } catch (err) {
      console.warn('[AI] Scryfall enrichment failed:', err.message);
    }

    res.json({
      commander: commanderCard,
      deck: deckData
    });

  } catch (error) {
    console.error('[AI] OpenAI Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate deck' });
  }
});

export default router;
