async function testMarket() {
  const endpoints = [
    "http://localhost:4000/api/market/quote/RELIANCE",
    "http://localhost:4000/api/market/quote/NIFTY",
    "http://localhost:4000/api/market/quote/SENSEX",
    "http://localhost:4000/api/market/indices",
    "http://localhost:4000/api/market/quote/NVDA",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`\n=== GET ${url} [Status: ${res.status}] ===`);
      if (data.indices) {
        console.log(`Indices:`, data.indices);
      } else {
        console.log(`Ticker: ${data.ticker} | Company: ${data.companyName} | Price: ${data.currency} ${data.price} | Change: ${data.change} (${data.changePct}%) | ChartBars: ${data.chartData?.length || 0}`);
      }
    } catch (err) {
      console.error(`Failed ${url}:`, err.message);
    }
  }
}

testMarket();
