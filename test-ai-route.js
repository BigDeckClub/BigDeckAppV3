// Test script for AI route
const testUrl = 'http://localhost:5000/api/ai/ping';

fetch(testUrl)
    .then(res => res.json())
    .then(data => {
        console.log('Ping Response:', data);

        // Now test the generate endpoint
        return fetch('http://localhost:5000/api/ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // You'll need a real token
            },
            body: JSON.stringify({
                commander: 'Atraxa, Praetors\' Voice',
                theme: 'Superfriends',
                budget: 'Mid',
                powerLevel: '7'
            })
        });
    })
    .then(res => res.json())
    .then(data => console.log('Generate Response:', data))
    .catch(err => console.error('Error:', err));
