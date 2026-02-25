import http from 'http';

const data = JSON.stringify({});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/metricas/yampi/sync',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => { body += d; });
    res.on('end', () => {
        console.log(`Status Check: ${res.statusCode}`);
        try {
            console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
