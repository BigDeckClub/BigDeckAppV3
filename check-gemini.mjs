// Check if Gemini is configured
async function checkGemini() {
    console.log('Checking Gemini status...');
    try {
        const res = await fetch('http://localhost:5000/api/ai/ping');
        const data = await res.json();
        console.log('✓ Ping Response:', JSON.stringify(data, null, 2));

        if (!data.gemini_key_set) {
            console.error('✗ GEMINI_API_KEY is not set!');
            console.log('Please restart the server after adding the key to .env');
        } else {
            console.log('✓ Gemini API key is configured');
        }
    } catch (err) {
        console.error('✗ Error:', err.message);
    }
}

checkGemini();
