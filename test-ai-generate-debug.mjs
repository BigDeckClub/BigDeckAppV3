
import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

// Mock dependencies
const mockReq = {
    body: {
        commander: 'Atraxa, Praetors\' Voice',
        theme: 'Superfriends',
        budget: 500,
        bracket: '7'
    },
    userId: 'mock-user-id'
};

async function runDebug() {
    console.log('Starting Debug Script...');

    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is missing!');
        }

        const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('OpenAI initialized.');

        // 1. Identify Commander (Mocked)
        const commanderName = mockReq.body.commander;
        console.log(`Commander: ${commanderName}`);

        // 2. Fetch Commander Details
        console.log('Fetching from Scryfall...');
        const scryfallRes = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(commanderName)}`);
        if (!scryfallRes.ok) throw new Error(`Scryfall failed: ${scryfallRes.status}`);
        const commanderCard = await scryfallRes.json();
        console.log(`Scryfall Data: ${commanderCard.name}`);

        // 3. Fetch EDHREC
        console.log('Fetching EDHREC...');
        const slug = commanderName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        const edhrecUrl = `https://json.edhrec.com/pages/commanders/${slug}.json`;
        const edhrecRes = await fetch(edhrecUrl);
        if (!edhrecRes.ok) console.warn(`EDHREC failed: ${edhrecRes.status}`);
        else console.log('EDHREC fetched successfully.');

        // 4. Test OpenAI Call (Pass 1 only to save tokens)
        console.log('Testing OpenAI Pass 1...');
        const soulPrompt = `Test prompt for ${commanderName}`;
        const soulCompletion = await api.chat.completions.create({
            messages: [{ role: "user", content: soulPrompt }],
            model: "gpt-4o",
            max_tokens: 50
        });
        console.log('OpenAI Response:', soulCompletion.choices[0].message.content);

        console.log('✅ DEBUG SUCCESS: Basic connectivity works.');

    } catch (error) {
        console.error('❌ DEBUG FAILED:', error);
    }
}

runDebug();
