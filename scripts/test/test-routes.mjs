async function testRoutes() {
    console.log('Testing /api/ai/test (no auth)...');
    try {
        const res = await fetch('http://localhost:5000/api/ai/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'data' })
        });
        const data = await res.json();
        console.log('✓ Test route response:', data);
    } catch (err) {
        console.error('✗ Test route error:', err.message);
    }
}

testRoutes();
