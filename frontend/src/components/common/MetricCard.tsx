interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  icon?: React.ElementType;
  trendUp?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend, icon: Icon, trendUp }) => {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Icon className="h-4 w-4 text-indigo-600" />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground font-mono mt-1">{value}</p>
      {trend && (
        <p className={`text-xs mt-2 font-semibold ${trendUp !== undefined ? (trendUp ? 'text-profit' : 'text-loss') : 'text-indigo-600'}`}>
          {trend}
        </p>
      )}
    </div>
  );
};
