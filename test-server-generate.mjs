// import fetch from 'node-fetch'; // Actually use built-in fetch if node 18+

async function testGenerate() {
    console.log('Testing /api/ai/generate (Auth Disabled)...');
    try {
        const res = await fetch('http://localhost:5000/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commander: 'Atraxa, Praetors\' Voice',
                theme: 'Infect',
                budget: 'High',
                powerLevel: '8'
            })
        });

        // Check status
        console.log(`Status: ${res.status} ${res.statusText}`);

        // Get headers to see content type
        const contentType = res.headers.get('content-type');
        console.log('Content-Type:', contentType);

        // Get body strictly
        const text = await res.text();
        console.log('Raw Body:', text.substring(0, 500)); // First 500 chars

        if (contentType && contentType.includes('application/json')) {
            const data = JSON.parse(text);
            if (res.status === 200) {
                console.log('✓ Success! Deck generated.');
                console.log('Commander:', data.commander?.name);
                console.log('Deck cards count:', data.deck?.cards?.length);
            } else {
                console.error('✗ API Error:', JSON.stringify(data, null, 2));
            }
        }
    } catch (err) {
        console.error('✗ Network/Test Error:', err.message);
    }
}

testGenerate();
