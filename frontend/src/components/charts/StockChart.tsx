import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Maximize2, Compass, TrendingUp, BarChart2, CandlestickChart as CandleIcon } from 'lucide-react';

export interface ChartDataPoint {
  time: string;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export type ChartType = 'area' | 'candlestick' | 'bar';

interface StockChartProps {
  data: ChartDataPoint[];
  lineColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
  ticker?: string;
  currencySymbol?: string;
  height?: number;
}

interface LegendData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
  changePct: number;
}

/**
 * Computes a Simple Moving Average (SMA)
 */
function calculateSMA(data: { time: string; value: number }[], period: number) {
  const result: { time: string; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value;
    }
    result.push({ time: data[i].time, value: Number((sum / period).toFixed(2)) });
  }
  return result;
}

/**
 * Computes an Exponential Moving Average (EMA)
 */
function calculateEMA(data: { time: string; value: number }[], period: number) {
  const result: { time: string; value: number }[] = [];
  if (data.length < period) return result;

  const multiplier = 2 / (period + 1);
  let prevEma = data.slice(0, period).reduce((acc, curr) => acc + curr.value, 0) / period;
  result.push({ time: data[period - 1].time, value: Number(prevEma.toFixed(2)) });

  for (let i = period; i < data.length; i++) {
    const current = (data[i].value - prevEma) * multiplier + prevEma;
    result.push({ time: data[i].time, value: Number(current.toFixed(2)) });
    prevEma = current;
  }
  return result;
}

export const StockChart = ({
  data,
  lineColor = '#6366f1',
  areaTopColor = 'rgba(99,102,241,0.18)',
  areaBottomColor = 'rgba(99,102,241,0.01)',
  ticker = 'STOCK',
  currencySymbol = '₹',
  height = 340,
}: StockChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series references
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const barSeriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // UI state
  const [chartType, setChartType] = useState<ChartType>('area');
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showSMA, setShowSMA] = useState<boolean>(false);
  const [showEMA, setShowEMA] = useState<boolean>(false);
  const [isFitted, setIsFitted] = useState(true);

  // Active hover legend data
  const [hoverLegend, setHoverLegend] = useState<LegendData | null>(null);

  // Generate standardized OHLCV dataset
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return { candles: [], area: [], volume: [] };

    const area: { time: string; value: number }[] = [];
    const candles: { time: string; open: number; high: number; low: number; close: number }[] = [];
    const volume: { time: string; value: number; color: string }[] = [];

    data.forEach((pt, idx) => {
      const price = pt.value || pt.close || 100;
      area.push({ time: pt.time, value: price });

      // Generate or use authentic OHLC values
      const prevPrice = idx > 0 ? (data[idx - 1].value || data[idx - 1].close || price) : price * 0.998;
      const open = pt.open ?? prevPrice;
      const close = pt.close ?? price;
      const maxVal = Math.max(open, close);
      const minVal = Math.min(open, close);
      const high = pt.high ?? Number((maxVal * (1 + 0.003)).toFixed(2));
      const low = pt.low ?? Number((minVal * (1 - 0.003)).toFixed(2));

      candles.push({
        time: pt.time,
        open,
        high,
        low,
        close,
      });

      // Synthetic or real volume
      const isUp = close >= open;
      const vol = pt.volume ?? Math.floor(25000 + Math.abs(close - open) * 80000 + (idx % 5) * 12000);
      volume.push({
        time: pt.time,
        value: vol,
        color: isUp ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
      });
    });

    return { area, candles, volume };
  }, [data]);

  // Default legend is the last data point
  const lastCandle = useMemo(() => {
    if (formattedData.candles.length === 0) return null;
    const last = formattedData.candles[formattedData.candles.length - 1];
    const prev = formattedData.candles.length > 1 ? formattedData.candles[formattedData.candles.length - 2].close : last.open;
    const changePct = Number((((last.close - prev) / prev) * 100).toFixed(2));
    const lastVol = formattedData.volume[formattedData.volume.length - 1]?.value ?? 0;
    return {
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: lastVol,
      time: last.time,
      changePct,
    };
  }, [formattedData]);

  const activeDisplay = hoverLegend || lastCandle;

  // Fit content
  const handleReset180View = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setIsFitted(true);
    }
  };

  // Initialize TradingView chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.035)' },
        horzLines: { color: 'rgba(0,0,0,0.035)' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.08,
          bottom: showVolume ? 0.22 : 0.08,
        },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(99, 102, 241, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
    });

    // 1. Volume Histogram (bottom 20% margin)
    const volumeSeries = chart.addHistogramSeries({
      color: '#10b981',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 2. Area Series (Groww Line)
    const areaSeries = chart.addAreaSeries({
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: 2,
    });
    areaSeriesRef.current = areaSeries;

    // 3. Candlestick Series (Upstox Candles)
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // 4. Bar Series (OHLC Bars)
    const barSeries = chart.addBarSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
    });
    barSeriesRef.current = barSeries;

    // 5. SMA 20 Series
    const smaSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA 20',
    });
    smaSeriesRef.current = smaSeries;

    // 6. EMA 50 Series
    const emaSeries = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 2,
      title: 'EMA 50',
    });
    emaSeriesRef.current = emaSeries;

    chartRef.current = chart;

    // Crosshair listener for Groww/Upstox hover tooltip
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverLegend(null);
        return;
      }

      const candleData = (param.seriesData.get(candleSeries) ||
        param.seriesData.get(areaSeries) ||
        param.seriesData.get(barSeries)) as any;

      if (candleData) {
        const timeStr = typeof param.time === 'string' ? param.time : new Date(Number(param.time) * 1000).toISOString().split('T')[0];
        const open = candleData.open ?? candleData.value ?? 0;
        const high = candleData.high ?? candleData.value ?? 0;
        const low = candleData.low ?? candleData.value ?? 0;
        const close = candleData.close ?? candleData.value ?? 0;
        const changePct = open > 0 ? Number((((close - open) / open) * 100).toFixed(2)) : 0;
        const vol = (param.seriesData.get(volumeSeries) as any)?.value ?? 0;

        setHoverLegend({
          open,
          high,
          low,
          close,
          volume: vol,
          time: timeStr,
          changePct,
        });
      }
    });

    chart.timeScale().subscribeVisibleTimeRangeChange(() => {
      setIsFitted(false);
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        chartRef.current.timeScale().fitContent();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize data and chart types
  useEffect(() => {
    if (!chartRef.current) return;

    // Populate Volume data
    if (volumeSeriesRef.current) {
      if (showVolume && formattedData.volume.length > 0) {
        volumeSeriesRef.current.setData(formattedData.volume as any);
        volumeSeriesRef.current.applyOptions({ visible: true });
      } else {
        volumeSeriesRef.current.applyOptions({ visible: false });
      }
    }

    // Toggle Price Series visibility
    if (areaSeriesRef.current) {
      if (chartType === 'area') {
        areaSeriesRef.current.setData(formattedData.area as any);
        areaSeriesRef.current.applyOptions({ visible: true });
      } else {
        areaSeriesRef.current.applyOptions({ visible: false });
      }
    }

    if (candleSeriesRef.current) {
      if (chartType === 'candlestick') {
        candleSeriesRef.current.setData(formattedData.candles as any);
        candleSeriesRef.current.applyOptions({ visible: true });
      } else {
        candleSeriesRef.current.applyOptions({ visible: false });
      }
    }

    if (barSeriesRef.current) {
      if (chartType === 'bar') {
        barSeriesRef.current.setData(formattedData.candles as any);
        barSeriesRef.current.applyOptions({ visible: true });
      } else {
        barSeriesRef.current.applyOptions({ visible: false });
      }
    }

    // Calculate & update SMA 20
    if (smaSeriesRef.current) {
      if (showSMA && formattedData.area.length >= 20) {
        const smaData = calculateSMA(formattedData.area, 20);
        smaSeriesRef.current.setData(smaData as any);
        smaSeriesRef.current.applyOptions({ visible: true });
      } else {
        smaSeriesRef.current.applyOptions({ visible: false });
      }
    }

    // Calculate & update EMA 50
    if (emaSeriesRef.current) {
      if (showEMA && formattedData.area.length >= 20) {
        const emaData = calculateEMA(formattedData.area, Math.min(50, formattedData.area.length - 1));
        emaSeriesRef.current.setData(emaData as any);
        emaSeriesRef.current.applyOptions({ visible: true });
      } else {
        emaSeriesRef.current.applyOptions({ visible: false });
      }
    }

    chartRef.current.timeScale().fitContent();
    setIsFitted(true);
  }, [formattedData, chartType, showVolume, showSMA, showEMA]);

  return (
    <div className="relative w-full bg-white rounded-xl select-none">
      {/* Groww / Upstox Chart Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-2 border-b border-border text-xs">
        {/* Chart Type Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setChartType('area')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
              chartType === 'area'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Line / Area Chart (Groww Style)"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Line</span>
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
              chartType === 'candlestick'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Candlestick Chart (Upstox / TradingView Style)"
          >
            <CandleIcon className="h-3.5 w-3.5" />
            <span>Candles</span>
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
              chartType === 'bar'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="OHLC Bar Chart"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Bars</span>
          </button>
        </div>

        {/* Indicators Overlay Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-md font-medium text-[11px] border transition-all ${
              showVolume
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            Vol {showVolume ? '✓' : ''}
          </button>
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-2.5 py-1 rounded-md font-medium text-[11px] border transition-all ${
              showSMA
                ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            SMA 20 {showSMA ? '✓' : ''}
          </button>
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 rounded-md font-medium text-[11px] border transition-all ${
              showEMA
                ? 'bg-cyan-50 border-cyan-300 text-cyan-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            EMA 50 {showEMA ? '✓' : ''}
          </button>

          <button
            onClick={handleReset180View}
            title="Reset to 180° Flat Horizon View (Fit to Screen)"
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border shadow-xs transition-all ${
              isFitted
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <Compass className="h-3 w-3 text-indigo-500" />
            <span className="hidden sm:inline">180° View</span>
            <Maximize2 className="h-2.5 w-2.5 opacity-60" />
          </button>
        </div>
      </div>

      {/* Upstox / Groww Live OHLCV Crosshair Legend Header */}
      {activeDisplay && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono mb-2 text-slate-600 bg-slate-50/70 border border-slate-100 px-3 py-1.5 rounded-lg">
          <span className="font-bold text-slate-900">{ticker}</span>
          <span>
            O <strong className="text-slate-900">{currencySymbol}{activeDisplay.open?.toFixed(2)}</strong>
          </span>
          <span>
            H <strong className="text-emerald-600">{currencySymbol}{activeDisplay.high?.toFixed(2)}</strong>
          </span>
          <span>
            L <strong className="text-red-500">{currencySymbol}{activeDisplay.low?.toFixed(2)}</strong>
          </span>
          <span>
            C <strong className="text-slate-900">{currencySymbol}{activeDisplay.close?.toFixed(2)}</strong>
          </span>
          <span>
            Vol <strong className="text-slate-800">{activeDisplay.volume > 1000000 ? `${(activeDisplay.volume / 1000000).toFixed(2)}M` : activeDisplay.volume.toLocaleString()}</strong>
          </span>
          <span className={activeDisplay.changePct >= 0 ? 'text-emerald-600 font-bold ml-auto' : 'text-red-500 font-bold ml-auto'}>
            {activeDisplay.changePct >= 0 ? '+' : ''}{activeDisplay.changePct}%
          </span>
        </div>
      )}

      {/* Chart Canvas */}
      <div
        ref={chartContainerRef}
        className="w-full cursor-crosshair"
        onDoubleClick={handleReset180View}
        title="Double-click chart to reset 180° view"
      />
    </div>
  );
};
