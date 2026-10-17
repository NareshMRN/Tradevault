import React from 'react';
import heroChartImg from '@/assets/hero-chart.png';

export const HeroCandlestickVisual: React.FC = () => {
  return (
    <div className="w-full max-w-2xl lg:max-w-none flex flex-col items-center justify-center">
      {/* 3D Perspective Glowing Card Container */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 bg-gradient-to-b from-cyan-500/20 via-indigo-500/10 to-transparent dark:from-cyan-400/25 dark:via-blue-500/15 dark:to-transparent border border-cyan-500/30 dark:border-cyan-400/30 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.35)] backdrop-blur-xl group transition-all duration-500 hover:shadow-[0_25px_80px_-10px_rgba(6,182,212,0.5)] hover:border-cyan-400/60">
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-cyan-500/25 dark:bg-cyan-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/20 dark:bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Render Image */}
        <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#040816] shadow-2xl">
          <img
            src={heroChartImg}
            alt="TradeVault AI Autonomous Multi-Agent Trading Terminal & Predictions"
            className="w-full h-auto object-cover transform transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
};
