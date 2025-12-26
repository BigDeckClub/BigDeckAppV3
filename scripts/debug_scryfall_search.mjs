import fetch from 'node-fetch';
import fs from 'fs';

const logStream = fs.createWriteStream('debug_output.txt', { flags: 'w' });
function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

async function testSearch(query) {
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}+is:commander&order=edhrec&unique=cards`;
    log(`Testing URL: ${scryfallUrl}`);

    try {
        const response = await fetch(scryfallUrl);
        log(`Status: ${response.status}`);

        if (!response.ok) {
            log('Error Text: ' + await response.text());
            return;
        }

        const data = await response.json();
        log(`Found ${data.total_cards} cards.`);
        if (data.data) {
            log('Top 5 results:');
            data.data.slice(0, 5).forEach(c => log(`- ${c.name} (${c.type_line})`));
        }
    } catch (err) {
        log('Fetch failed: ' + err);
    }
}

async function run() {
    log('--- Testing "avatar" ---');
    await testSearch('avatar');

    log('\n--- Testing "avatar aang" ---');
    await testSearch('avatar aang');
    logStream.end();
}

run();
