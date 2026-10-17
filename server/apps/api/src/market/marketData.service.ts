import { CurrentPriceService, LiveMarketQuote } from "./currentPriceService";
import { HistoricalService, Candle, Timeframe } from "./historical.service";
import { FundamentalsService, FundamentalsData } from "./fundamentals.service";
import { NewsService, NewsArticle } from "./news.service";

export interface UnifiedMarketData {
  symbol: string;
  exchange: "NSE" | "BSE";
  companyName: string;
  current: {
    price: number;
    open: number;
    high: number;
    low: number;
    close?: number;
    previousClose: number;
    volume: number;
    change: number;
    changePct: number;
    depth?: any;
  };
  historical: Candle[];
  fundamentals: FundamentalsData;
  news: NewsArticle[];
  timestamps: {
    market_data_at: string;
    news_data_at: string;
    historical_data_until: string;
  };
  source: string;
}

export class MarketDataService {
  /**
   * Loads and normalizes live quote, multi-timeframe candles, fundamentals, and news
   * into a provider-agnostic unified data packet.
   */
  public static async getUnifiedMarketData(
    rawSymbol: string,
    timeframe: Timeframe = "1y"
  ): Promise<UnifiedMarketData> {
    const { symbol, exchange } = CurrentPriceService.normalizeSymbol(rawSymbol);

    // 1. Fetch current price first to anchor historical series accurately
    const currentQuote = await CurrentPriceService.getQuote(symbol);

    // 2. Fetch candles, fundamentals, and news concurrently
    const [historicalCandles, fundamentals, newsArticles] = await Promise.all([
      HistoricalService.getCandles(symbol, timeframe, currentQuote.price),
      FundamentalsService.getFundamentals(symbol),
      NewsService.getNews(symbol),
    ]);

    const nowIso = new Date().toISOString();
    const lastCandleDate = historicalCandles.length > 0
      ? historicalCandles[historicalCandles.length - 1].date
      : nowIso.split("T")[0];

    return {
      symbol,
      exchange,
      companyName: currentQuote.companyName,
      current: {
        price: currentQuote.price,
        open: currentQuote.open,
        high: currentQuote.high,
        low: currentQuote.low,
        close: currentQuote.price,
        previousClose: currentQuote.previousClose,
        volume: currentQuote.volume,
        change: currentQuote.change,
        changePct: currentQuote.changePct,
        depth: currentQuote.depth,
      },
      historical: historicalCandles,
      fundamentals,
      news: newsArticles,
      timestamps: {
        market_data_at: currentQuote.asOf || nowIso,
        news_data_at: newsArticles.length > 0 ? newsArticles[0].publishedAt : nowIso,
        historical_data_until: lastCandleDate,
      },
      source: currentQuote.source,
    };
  }
}
