import fetch from 'node-fetch';

async function test() {
  const url = 'http://localhost:4000/api/analytics/meta/metrics?tenantId=a96aea07-882d-4b1e-b017-9012413bb4d0&startDate=2024-01-01&endDate=2026-12-31';
  console.log("Fetching", url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (e) {
    console.error(e);
  }
}
test();
