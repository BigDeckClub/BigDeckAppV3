
// Use native fetch (Node 18+)

async function getCommanderDetails(query) {
    try {
        console.log(`[DEBUG] Looking up: "${query}"`);

        // Test 1: Exact
        let response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query)}`);
        console.log(`[DEBUG] Exact Answer: ${response.status}`);

        // Test 2: Search (The one I hope works)
        response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=edhrec`);
        if (response.ok) {
            const data = await response.json();
            console.log(`[DEBUG] Search found ${data.total_cards} cards.`);
            if (data.data && data.data.length > 0) {
                console.log(`[DEBUG] Top Search Result: "${data.data[0].name}" (${data.data[0].type_line})`);
            }
        } else {
            console.log(`[DEBUG] Search failed: ${response.status}`);
        }

        // Test 3: Fuzzy (The one that failed)
        response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`[DEBUG] Fuzzy Result: "${data.name}" (${data.type_line})`);
        } else {
            console.log(`[DEBUG] Fuzzy failed: ${response.status}`);
        }

    } catch (err) {
        console.error('Scryfall lookup failed:', err);
    }
}

async function test() {
    const userPrompt = "build me an avatar aang deck";

    // Logic from ai.js (EXACT COPY)
    const cleanPrompt = userPrompt
        .replace(/\b(build|make|create|construct|draft|brew|deck|commander|edh|based on|theme|around|for|me|a|an|the)\b/gi, ' ')
        .replace(/[^\w\s'-]/g, '')
        .trim();

    console.log(`[DEBUG] Original Prompt: "${userPrompt}"`);
    console.log(`[DEBUG] Cleaned Prompt: "${cleanPrompt}"`);
    console.log(`[DEBUG] Length: ${cleanPrompt.length}`);

    const result = await getCommanderDetails(cleanPrompt);
}

test();
