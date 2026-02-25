import fetch from 'node-fetch';

async function testSync() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/metricas/yampi/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testSync();
