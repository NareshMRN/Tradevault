import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Compass } from 'lucide-react';

interface ChartDataPoint {
  time: string;
  value: number;
}

interface StockChartProps {
  data: ChartDataPoint[];
  lineColor?: string;
  areaTopColor?: string;
  areaBottomColor?: string;
}

export const StockChart = ({
  data,
  lineColor = '#6366f1',
  areaTopColor = 'rgba(99,102,241,0.2)',
  areaBottomColor = 'rgba(99,102,241,0.0)',
}: StockChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [isFitted, setIsFitted] = useState(true);

  // Reset to full 180° horizontal view
  const handleReset180View = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setIsFitted(true);
    }
  };

  // Initialise chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(0,0,0,0.04)' },
        horzLines: { color: 'rgba(0,0,0,0.04)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 290,
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        // Crucial: Fix edges so horizontal panning/swiping cannot scroll into empty space
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightOffset: 0,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const series = chart.addAreaSeries({
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Listen to time scale changes to indicate if user panned away from 180° fit
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data whenever it changes (timeframe switch or live tick update)
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
      setIsFitted(true);
    }
  }, [data]);

  return (
    <div className="relative w-full group">
      {/* 180° View Horizon Reset Overlay */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleReset180View}
          title="Reset to 180° Flat Horizon View (Fit to Screen)"
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border shadow-sm transition-all ${
            isFitted
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
          }`}
        >
          <Compass className="h-3 w-3 text-indigo-500" />
          <span>180° View</span>
          <Maximize2 className="h-2.5 w-2.5 ml-0.5 opacity-60" />
        </button>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full cursor-crosshair"
        onDoubleClick={handleReset180View}
        title="Double-click chart to reset 180° view"
      />
    </div>
  );
};
