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
      className={`bg-gradient-to-br ${bgColorClasses[color]} rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-8 hover-lift card-premium animate-scale-in group relative overflow-hidden interactive-card touch-target`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent opacity-60" />
      
      {/* Animated background orbs */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full blur-lg animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1 relative z-10 min-w-0">
          <h3 className="text-xs sm:text-base font-bold text-gray-800 mb-2 sm:mb-4 tracking-wider uppercase opacity-90 truncate">{title}</h3>
          <p className="text-xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-3 tracking-tight drop-shadow-sm break-all">{value}</p>
          {change && (
            <p className={`text-xs sm:text-base font-bold ${changeColorClasses[changeType]} flex items-center space-x-1 sm:space-x-2`}>
              <span className={`w-3 h-3 rounded-full animate-pulse ${
                changeType === 'positive' ? 'bg-green-500' :
                changeType === 'negative' ? 'bg-red-500' : 'bg-gray-500'
              }`} />
              <span>
              {change}
              </span>
            </p>
          )}
        </div>
        <div className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-xl relative z-10 group-hover:scale-110 sm:group-hover:scale-125 group-hover:rotate-6 sm:group-hover:rotate-12 transition-all duration-500 animate-glow flex-shrink-0`}>
          <Icon size={20} className="sm:w-8 sm:h-8 drop-shadow-lg" />
        </div>
      </div>
      
      {/* Glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${colorClasses[color]} rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300`} />
    </div>
  );
};

export default MetricCard;