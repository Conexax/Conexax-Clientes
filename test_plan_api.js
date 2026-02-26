const http = require('http');

const payload = JSON.stringify({
  name: "Plano Teste API",
  price_quarterly: 100,
  price_semiannual: 200,
  price_yearly: 300,
  features: ["Feature 1", "Feature 2"],
  active: true,
  recommended: false
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/admin/plans',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
