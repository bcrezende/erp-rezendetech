import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red';
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  color = 'blue',
  delay = 0
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    orange: 'from-orange-500 to-orange-600 text-white',
    red: 'from-red-500 to-red-600 text-white'
  };

  const changeColorClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  };

  const bgColorClasses = {
    blue: 'from-blue-50 to-blue-100',
    green: 'from-green-50 to-green-100',
    orange: 'from-orange-50 to-orange-100',
    red: 'from-red-50 to-red-100'
  };

  return (
    <div 
      className={`bg-gradient-to-br ${bgColorClasses[color]} rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 hover-lift card-modern animate-slide-in-up group relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1 relative z-10">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 tracking-wide uppercase">{title}</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">{value}</p>
          {change && (
            <p className={`text-xs sm:text-sm font-semibold ${changeColorClasses[changeType]} flex items-center space-x-1`}>
              <span className={`w-2 h-2 rounded-full ${
                changeType === 'positive' ? 'bg-green-500' :
                changeType === 'negative' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span>
              {change}
              </span>
            </p>
          )}
        </div>
        <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className="sm:w-6 sm:h-6 drop-shadow-sm" />
        </div>
      </div>
      
      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${colorClasses[color]} rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300`} />
    </div>
  );
};

export default MetricCard;