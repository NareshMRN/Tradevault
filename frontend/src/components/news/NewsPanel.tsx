import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MOCK_NEWS } from '@/services/mockData';

export const NewsPanel = () => {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-indigo-500" /> News & Sentiment
        </h3>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-2.5 custom-scrollbar">
        {MOCK_NEWS.map((news) => (
          <div key={news.id} className="p-4 rounded-lg bg-slate-50 border border-border hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="text-xs font-semibold text-foreground leading-snug">{news.headline}</h4>
              <div className={`p-1 rounded-md shrink-0 ${news.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-600' : news.sentiment === 'Negative' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                {news.sentiment === 'Positive' && <TrendingUp className="h-3.5 w-3.5" />}
                {news.sentiment === 'Negative' && <TrendingDown className="h-3.5 w-3.5" />}
                {news.sentiment === 'Neutral' && <Minus className="h-3.5 w-3.5" />}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-slate-500">{news.source}</span>
                <span>•</span>
                <span>{news.time}</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {news.relevance}% match
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
