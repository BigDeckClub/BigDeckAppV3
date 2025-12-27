
import dotenv from 'dotenv';
dotenv.config();

// Pricing for GPT-4o (Check updated pricing if needed, usually $2.50/1M In, $10.00/1M Out)
const PRICE_INPUT_PER_1K = 0.0025;
const PRICE_OUTPUT_PER_1K = 0.0100;

function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

// Mock Helpers from server/routes/ai.js
async function getCommanderDetails(query) {
    console.log(`[Mock] Fetching Scryfall for ${query}...`);
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query)}`);
    if (response.ok) return await response.json();
    return null;
}

async function getEdhrecRecommendations(commanderName, budgetType = null) {
    const slug = commanderName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    let url = `https://json.edhrec.com/pages/commanders/${slug}.json`;
    if (budgetType) url = `https://json.edhrec.com/pages/commanders/${slug}/${budgetType}.json`;

    console.log(`[Mock] Fetching EDHREC: ${url}`);
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const container = data.container || {};
    const cardLists = container.cardlists || [];
    const taglinks = data.panels?.taglinks || [];

    const archetypes = taglinks.slice(0, 10).map(t => t.value);
    const combos = (data.panels?.combocounts || []).slice(0, 10).map(c => c.value);

    const recommendations = {
        archetypes, combos, highSynergy: [], topCards: [], creatures: [],
        instants: [], sorceries: [], utilityArtifacts: [], manaArtifacts: [],
        enchantments: [], planeswalkers: [], utilityLands: [], lands: []
    };

    cardLists.forEach(list => {
        const cards = (list.cardviews || []).slice(0, 20).map(c => c.name);
        switch (list.tag) {
            case 'highsynergycards': recommendations.highSynergy = cards; break;
            case 'topcards': recommendations.topCards = cards; break;
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
    return recommendations;
}

// Mock Inventory (300 cards ~ 6000 chars)
const mockInventory = Array(300).fill("Mock Card Name").join(", ");

async function runEstimation() {
    console.log("--- STARTING COST ESTIMATION ---");

    const commanderName = "Atraxa, Praetors' Voice";
    const budget = 500;
    const bracket = "7";
    const theme = "Superfriends";

    // 1. Commander Details
    const commanderCard = await getCommanderDetails(commanderName);
    const colorString = commanderCard.color_identity.join('');
    const keywordsString = (commanderCard.keywords || []).join(', ');

    // 2. EDHREC Data
    const edhrec = await getEdhrecRecommendations(commanderName);
    const edhrecContext = `
**EDHREC RECOMMENDATIONS:**
ARCHETYPES: ${edhrec.archetypes.join(', ')}
COMBOS: ${edhrec.combos.join('\n')}
HIGH SYNERGY: ${edhrec.highSynergy.join(', ')}
TOP CARDS: ${edhrec.topCards.join(', ')}
CREATURES: ${edhrec.creatures.join(', ')}
INSTANTS: ${edhrec.instants.join(', ')}
SORCERIES: ${edhrec.sorceries.join(', ')}
ARTIFACTS: ${edhrec.utilityArtifacts.join(', ')}
ROCKS: ${edhrec.manaArtifacts.join(', ')}
ENCHANTMENTS: ${edhrec.enchantments.join(', ')}
PLANESWALKERS: ${edhrec.planeswalkers.join(', ')}
LANDS: ${edhrec.lands.join(', ')}
`;

    const combinedContext = edhrecContext + `\nInventory: ${mockInventory}`;

    // --- PASS 1: SOUL ---
    const soulPrompt = `You are a Grandmaster MTG Deck Builder. 
Commander: ${commanderCard.name}
Colors: ${colorString}
Keywords: ${keywordsString}
Target Budget: $${budget}
Target Power Bracket: ${bracket}
User Request: ${theme}
Archetypes: ${edhrec.archetypes.join(', ')}
Task: Generate a brief strategy description (1-2 sentences) and 3 core themes for this deck.`;

    const soulInputTokens = estimateTokens(soulPrompt);
    const soulOutputTokens = estimateTokens('{"description": "A powerful superfriends strategy...", "themes": ["Planeswalkers", "Proliferate", "Control"]}'); // Est 30 words

    console.log(`\n[Pass 1 - Soul] Input: ${soulInputTokens} toks, Output: ${soulOutputTokens} toks`);

    // --- PASS 2: HEART ---
    const heartPrompt = `You are a Grandmaster MTG Deck Builder.
Commander: ${commanderCard.name}
Strategy: A powerful superfriends strategy...
Themes: Planeswalkers, Proliferate, Control
Task: Generate EXACTLY 34 high-synergy non-land cards.
Context: ${combinedContext}`;

    const heartInputTokens = estimateTokens(heartPrompt);
    // Output: 34 cards * ~50 chars per line JSON = 1700 chars
    const heartOutputTokens = estimateTokens(JSON.stringify({ cards: Array(34).fill({ name: "Card Name", category: "Synergy", quantity: 1 }) }));

    console.log(`[Pass 2 - Heart] Input: ${heartInputTokens} toks, Output: ${heartOutputTokens} toks`);

    // --- PASS 3: ENGINE ---
    const enginePrompt = `You are a Grandmaster MTG Deck Builder.
Commander: ${commanderCard.name}
Strategy: A powerful superfriends strategy...
Task: Generate EXACTLY 30 non-land staple cards.
Context: ${combinedContext}`;

    const engineInputTokens = estimateTokens(enginePrompt);
    const engineOutputTokens = estimateTokens(JSON.stringify({ cards: Array(30).fill({ name: "Card Name", category: "Ramp", quantity: 1 }) }));

    console.log(`[Pass 3 - Engine] Input: ${engineInputTokens} toks, Output: ${engineOutputTokens} toks`);

    // --- TOTALS ---
    const totalInput = soulInputTokens + heartInputTokens + engineInputTokens;
    const totalOutput = soulOutputTokens + heartOutputTokens + engineOutputTokens;

    const costInput = (totalInput / 1000) * PRICE_INPUT_PER_1K;
    const costOutput = (totalOutput / 1000) * PRICE_OUTPUT_PER_1K;
    const totalCost = costInput + costOutput;

    console.log("\n--- ESTIMATION RESULTS ---");
    console.log(`Total Input Tokens: ~${totalInput}`);
    console.log(`Total Output Tokens: ~${totalOutput}`);
    console.log(`Total Cost: $${totalCost.toFixed(4)} per deck`);

    console.log(`\nBreakdown:`);
    console.log(`Input Cost: $${costInput.toFixed(4)}`);
    console.log(`Output Cost: $${costOutput.toFixed(4)}`);
}

runEstimation();
