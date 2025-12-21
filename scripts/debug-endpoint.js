import http from 'http';

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/inventory',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer fake-token-for-debug'
    }
};

console.log(`Requesting http://${options.hostname}:${options.port}${options.path}...`);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
