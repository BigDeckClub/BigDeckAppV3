import fetch from 'node-fetch';
import fs from 'fs';

const logStream = fs.createWriteStream('debug_output_autocomplete.txt', { flags: 'w' });
function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

async function testAutocomplete(query) {
    const url = `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`;
    log(`Testing Autocomplete: ${url}`);

    try {
        const response = await fetch(url);
        log(`Status: ${response.status}`);

        if (!response.ok) {
            log('Error: ' + await response.text());
            return;
        }

        const data = await response.json();
        log(`Found ${data.data.length} suggestions.`);
        data.data.forEach(name => log(`- ${name}`));
    } catch (err) {
        log('Fetch failed: ' + err);
    }
}

async function run() {
    log('--- Testing "avataar" ---');
    await testAutocomplete('avataar');

    log('\n--- Testing "avataar aang" ---');
    await testAutocomplete('avataar aang');
    logStream.end();
}

run();
