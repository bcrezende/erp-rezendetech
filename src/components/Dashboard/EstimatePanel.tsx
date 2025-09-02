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


      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .in('status', ['concluida', 'pago', 'recebido', 'concluída'])
        .gte('data_transacao', dateFilter.startDate)
        .lte('data_transacao', dateFilter.endDate);

      if (error) throw error;
      
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
    <div className="card-premium rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-6 lg:p-8 hover-lift relative overflow-hidden animate-slide-in-up">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 via-pink-50/40 to-blue-50/60 rounded-2xl sm:rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-28 h-28 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-4 left-4 w-20 h-20 bg-gradient-to-br from-pink-400/10 to-blue-400/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 min-w-0">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 via-pink-600 to-blue-600 rounded-xl sm:rounded-2xl shadow-xl hover-glow animate-scale-in">
            <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-base sm:text-lg lg:text-xl font-black bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 bg-clip-text text-transparent tracking-tight truncate">
          Estimativa de Resultado Mensal
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-right relative z-10 glass rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-2 font-semibold animate-slide-in-from-right">
          <Calendar size={14} className="inline mr-1 sm:mr-2" />
          <span className="hidden sm:inline">
            {formatDate(dateFilter.startDate)} - {formatDate(dateFilter.endDate)}
          </span>
          <span className="sm:hidden">
            Período
          </span>
        </div>
      </div>

      {/* Progresso do Mês */}
      <div className="mb-6 sm:mb-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-1 sm:space-y-0">
          <span className="text-xs sm:text-base font-black text-gray-800 tracking-wide">
            Progresso do Mês
          </span>
          <span className="text-xs sm:text-base font-black text-gray-900">
            {estimateData.daysElapsed} de {estimateData.totalDays} dias ({progressPercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-3 sm:h-4 shadow-inner relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      <div className="relative z-10 overflow-hidden">
        <table className="w-full">
          {/* Header da Tabela */}
          <thead className="sticky top-0 z-30 bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-lg shadow-lg">
            <tr>
              <th className="text-left p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40 w-1/3">
                Categoria
              </th>
              <th className="text-right p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40 w-1/3">
                Atual
              </th>
              <th className="text-right p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40 w-1/3">
                Estimativa
              </th>
            </tr>
          </thead>
          
          {/* Body da Tabela */}
          <tbody>
            {estimateItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-600 font-semibold animate-fade-in">
                  Nenhuma estimativa disponível
                </td>
              </tr>
            ) : (
              estimateItems.map((item, index) => {
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
                  <tr key={item.label}>
                    <td colSpan={3} className="p-0">
                      <div 
                        className={`m-2 rounded-xl sm:rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in touch-target ${
                          bgColorClasses[item.color as keyof typeof bgColorClasses]
                        }`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <table className="w-full">
                          <tbody>
                            <tr>
                              <td className="text-left p-4 w-1/3">
                                <span className="text-xs sm:text-sm lg:text-lg font-black text-gray-900 tracking-wide">
                                  {item.label}
                                </span>
                              </td>
                              <td className="text-right p-4 w-1/3">
                                <span className={`text-xs sm:text-sm lg:text-lg font-black tracking-tight ${
                                  colorClasses[item.color as keyof typeof colorClasses]
                                }`}>
                                  <span className="hidden sm:inline">{formatCurrency(item.current)}</span>
                                  <span className="sm:hidden">R$ {(item.current / 1000).toFixed(1)}k</span>
                                </span>
                              </td>
                              <td className="text-right p-4 w-1/3">
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs sm:text-sm lg:text-lg font-black tracking-tight ${
                                    colorClasses[item.color as keyof typeof colorClasses]
                                  }`}>
                                    <span className="hidden sm:inline">{formatCurrency(item.estimated)}</span>
                                    <span className="sm:hidden">R$ {(item.estimated / 1000).toFixed(1)}k</span>
                                  </span>
                                  <div className="flex items-center mt-1 hidden lg:flex">
                                    <TrendingUp size={14} className="mr-1" />
                                    <span className="text-xs font-bold">
                                      {item.current > 0 ? 
                                        `+${((item.estimated - item.current) / item.current * 100).toFixed(1)}%` : 
                                        'N/A'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EstimatePanel;