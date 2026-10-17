export const MOCK_PORTFOLIO = {
  totalValue: 12450.00,
  dayPnL: 240.50,
  dayPnLPct: 1.9,
  totalReturn: 2450.00,
  totalReturnPct: 24.5,
  cash: 3750.00,
  invested: 8700.00,
  riskLevel: 'Medium',
  activePositions: 4,
};

export const MOCK_POSITIONS = [
  { ticker: 'PLTR', type: 'Long', size: 150, entry: 49.85, current: 70.77, pnl: 13574, pnlPct: 41.9 },
  { ticker: 'ETH/USD', type: 'Swing', size: 10, entry: 2552.47, current: 3600.59, pnl: 26305, pnlPct: 41.0 },
  { ticker: 'TSLA', type: 'Call', size: 5, entry: 274.35, current: 346.70, pnl: 13900, pnlPct: 26.3 },
  { ticker: 'AAPL', type: 'Long', size: 15, entry: 172.40, current: 175.20, pnl: 42, pnlPct: 1.6 },
];

function generateChartData(days: number) {
  const data = [];
  let price = 2750 + Math.random() * 100;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * 40;
    price = Math.max(2400, Math.min(3200, price + change));
    data.push({
      time: date.toISOString().split('T')[0],
      value: parseFloat(price.toFixed(2)),
    });
  }
  // deduplicate dates (required by lightweight-charts)
  const seen = new Set<string>();
  return data.filter(d => { if (seen.has(d.time)) return false; seen.add(d.time); return true; });
}

export const CHART_DATA_BY_TIMEFRAME: Record<string, { time: string; value: number }[]> = {
  '1D': generateChartData(1),
  '1W': generateChartData(7),
  '1M': generateChartData(30),
  '3M': generateChartData(90),
  '1Y': generateChartData(365),
};

export const MOCK_CHART_DATA = CHART_DATA_BY_TIMEFRAME['1M'];


export const MOCK_AGENTS = [
  { id: 'data', name: 'Market Data Agent', status: 'COMPLETED', message: 'Retrieved OHLCV & L2 Orderbook', icon: 'Database' },
  { id: 'tech', name: 'Technical Analyst', status: 'COMPLETED', message: 'RSI(62), MACD Crossover Detected', icon: 'LineChart' },
  { id: 'fund', name: 'Fundamental Analyst', status: 'RUNNING', message: 'Analyzing Q3 Earnings Transcript...', icon: 'Briefcase' },
  { id: 'news', name: 'News & Sentiment', status: 'IDLE', message: 'Waiting for trigger...', icon: 'Newspaper' },
  { id: 'risk', name: 'Risk Analyst', status: 'IDLE', message: 'Pending technical & fundamental data', icon: 'ShieldAlert' },
];

export const MOCK_NEWS = [
  { id: 1, headline: 'Company announces major expansion into AI sector', source: 'Bloomberg', time: '10m ago', sentiment: 'Positive', relevance: 87 },
  { id: 2, headline: 'Q3 earnings beat expectations, guidance raised', source: 'Reuters', time: '1h ago', sentiment: 'Positive', relevance: 92 },
  { id: 3, headline: 'Competitor launches rival product, market share concerns', source: 'WSJ', time: '3h ago', sentiment: 'Negative', relevance: 65 },
];
