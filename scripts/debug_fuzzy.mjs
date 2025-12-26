import fetch from 'node-fetch';
import fs from 'fs';

const logStream = fs.createWriteStream('debug_output_fuzzy.txt', { flags: 'w' });
function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

async function testFuzzy(query) {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`;
    log(`Testing Fuzzy: ${url}`);

    try {
        const response = await fetch(url);
        log(`Status: ${response.status}`);

        if (!response.ok) {
            log('Error: ' + await response.text());
            return;
        }

        const data = await response.json();
        log(`Found: ${data.name} (${data.type_line})`);
    } catch (err) {
        log('Fetch failed: ' + err);
    }
}

async function run() {
    log('--- Testing "avataar" ---');
    await testFuzzy('avataar');

    log('\n--- Testing "avataar aang" ---');
    await testFuzzy('avataar aang');
    logStream.end();
}

run();
