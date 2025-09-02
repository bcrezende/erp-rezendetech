import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { EstimateData } from '../../types';
import { Calendar, TrendingUp } from 'lucide-react';

interface EstimatePanelProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}

const EstimatePanel: React.FC<EstimatePanelProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

  const loadTransactions = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        return;
      }

      console.log('🔍 Loading estimate transactions for period:', dateFilter);

      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .in('status', ['concluida', 'pago', 'recebido', 'concluída'])
        .gte('data_transacao', dateFilter.startDate)
        .lte('data_transacao', dateFilter.endDate);

      if (error) throw error;
      
      console.log('📊 Estimate transactions loaded:', {
        total: data?.length || 0,
        periodo: `${dateFilter.startDate} até ${dateFilter.endDate}`,
        transacoes: data
      });
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const estimateData = useMemo((): EstimateData => {
    // Parse dates correctly to avoid timezone issues
    const [startYear, startMonth, startDay] = dateFilter.startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateFilter.endDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    // Normalize today to midnight for accurate day difference calculation
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDateMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    
    // Total de dias no período
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // Dias decorridos no período (até hoje ou até o fim do período, o que for menor)
    const daysElapsed = Math.max(1, Math.min(
      Math.floor((Math.min(todayMidnight.getTime(), endDate.getTime()) - startDateMidnight.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      totalDays
    ));
    
    // As transações já vêm filtradas pelo período
    const periodTransactions = transactions;

    const currentRevenue = periodTransactions
      .filter(t => t.tipo === 'receita')
      .reduce((sum, t) => sum + t.valor, 0);

    const currentExpenses = periodTransactions
      .filter(t => t.tipo === 'despesa')
      .reduce((sum, t) => sum + t.valor, 0);

    const currentProfit = currentRevenue - currentExpenses;

    // Cálculo das estimativas
    const dailyRevenueAvg = daysElapsed > 0 ? currentRevenue / daysElapsed : 0;
    const dailyExpensesAvg = daysElapsed > 0 ? currentExpenses / daysElapsed : 0;

    const estimatedRevenue = dailyRevenueAvg * totalDays;
    const estimatedExpenses = dailyExpensesAvg * totalDays;
    const estimatedProfit = estimatedRevenue - estimatedExpenses;

    return {
      currentRevenue,
      currentExpenses,
      currentProfit,
      estimatedRevenue,
      estimatedExpenses,
      estimatedProfit,
      daysElapsed,
      totalDays
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const progressPercentage = (estimateData.daysElapsed / estimateData.totalDays) * 100;

  const estimateItems = [
    {
      label: 'Receita',
      current: estimateData.currentRevenue,
      estimated: estimateData.estimatedRevenue,
      color: 'green'
    },
    {
      label: 'Despesas',
      current: estimateData.currentExpenses,
      estimated: estimateData.estimatedExpenses,
      color: 'red'
    },
    {
      label: 'Lucro/Prejuízo',
      current: estimateData.currentProfit,
      estimated: estimateData.estimatedProfit,
      color: estimateData.estimatedProfit >= 0 ? 'blue' : 'orange'
    }
  ];

  return (
    <div className="card-premium rounded-3xl shadow-2xl border border-white/30 p-6 sm:p-8 hover-lift relative overflow-hidden animate-slide-in-up">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 via-pink-50/40 to-blue-50/60 rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-28 h-28 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-4 left-4 w-20 h-20 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-600 to-blue-600 rounded-2xl shadow-xl hover-glow animate-scale-in">
            <Calendar className="h-7 w-7 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-lg sm:text-xl font-black bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent tracking-tight">
          Estimativa de Resultado Mensal
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-right relative z-10 glass rounded-xl px-4 py-2 font-semibold animate-slide-in-from-right">
          <Calendar size={16} className="inline mr-2" />
          <span className="hidden sm:inline">
            {formatDate(dateFilter.startDate)} - {formatDate(dateFilter.endDate)}
          </span>
          <span className="sm:hidden">
            Período
          </span>
        </div>
      </div>

      {/* Progresso do Mês */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm sm:text-base font-black text-gray-800 tracking-wide">
            Progresso do Mês
          </span>
          <span className="text-sm sm:text-base font-black text-gray-900">
            {estimateData.daysElapsed} de {estimateData.totalDays} dias ({progressPercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 shadow-inner relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 h-4 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Tabela de Estimativas */}
      <div className="space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-sm sm:text-base font-black text-gray-800 pb-4 border-b-2 border-white/40 bg-gradient-to-r from-white/70 to-slate-50/70 rounded-xl p-4 backdrop-blur-lg shadow-lg">
          <span>Categoria</span>
          <span className="text-right">Atual</span>
          <span className="text-right">Estimativa</span>
        </div>

        {estimateItems.map((item, index) => {
          const colorClasses = {
            green: 'text-green-600',
            red: 'text-red-600',
            blue: 'text-blue-600',
            orange: 'text-orange-600'
          };

          const bgColorClasses = {
            green: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300',
            red: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300',
            blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300',
            orange: 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
          };

          return (
            <div 
              key={item.label}
              className={`grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-6 rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in ${
                bgColorClasses[item.color as keyof typeof bgColorClasses]
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className="text-base sm:text-lg font-black text-gray-900 tracking-wide">
                {item.label}
              </span>
              <span className={`text-right text-base sm:text-lg font-black tracking-tight ${
                colorClasses[item.color as keyof typeof colorClasses]
              }`}>
                {formatCurrency(item.current)}
              </span>
              <span className={`text-right text-base sm:text-lg font-black tracking-tight ${
                colorClasses[item.color as keyof typeof colorClasses]
              }`}>
                {formatCurrency(item.estimated)}
                <div className="flex items-center justify-end mt-2 hidden sm:flex">
                  <TrendingUp size={14} className="mr-1" />
                  <span className="text-xs font-bold">
                    {item.current > 0 ? 
                      `+${((item.estimated - item.current) / item.current * 100).toFixed(1)}%` : 
                      'N/A'
                    }
                  </span>
                </div>
              </span>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 glass rounded-2xl shadow-xl border border-white/30 relative z-10 animate-slide-in-up">
        <h4 className="text-base sm:text-lg font-black text-gray-900 mb-3 tracking-wide">📈 Análise Rápida</h4>
        <div className="space-y-2 text-sm sm:text-base text-gray-700 font-semibold">
          <p>
            • Base de cálculo: {estimateData.daysElapsed} dias decorridos de {estimateData.totalDays} dias no período
          </p>
          <p className="hidden sm:block">
            • Média diária de receita: {formatCurrency(estimateData.daysElapsed > 0 ? estimateData.currentRevenue / estimateData.daysElapsed : 0)}
          </p>
          <p className="hidden sm:block">
            • Média diária de despesas: {formatCurrency(estimateData.daysElapsed > 0 ? estimateData.currentExpenses / estimateData.daysElapsed : 0)}
          </p>
          <p className={`font-black text-base ${
            estimateData.estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            • Resultado projetado: {estimateData.estimatedProfit >= 0 ? 'Lucro' : 'Prejuízo'} de {formatCurrency(Math.abs(estimateData.estimatedProfit))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EstimatePanel;