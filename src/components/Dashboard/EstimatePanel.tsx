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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Estimativa de Resultado Mensal
        </h3>
        <div className="flex items-center text-xs sm:text-sm text-gray-500">
          <Calendar size={16} className="mr-1" />
          <span className="hidden sm:inline">
            {formatDate(dateFilter.startDate)} - {formatDate(dateFilter.endDate)}
          </span>
          <span className="sm:hidden">
            Período
          </span>
        </div>
      </div>

      {/* Progresso do Mês */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600">
            Progresso do Mês
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-900">
            {estimateData.daysElapsed} de {estimateData.totalDays} dias ({progressPercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
          <div 
            className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Tabela de Estimativas */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-600 pb-2 border-b border-gray-200">
          <span>Categoria</span>
          <span className="text-right">Atual</span>
          <span className="text-right">Estimativa</span>
        </div>

        {estimateItems.map((item) => {
          const colorClasses = {
            green: 'text-green-600',
            red: 'text-red-600',
            blue: 'text-blue-600',
            orange: 'text-orange-600'
          };

          const bgColorClasses = {
            green: 'bg-green-50 border-green-200',
            red: 'bg-red-50 border-red-200',
            blue: 'bg-blue-50 border-blue-200',
            orange: 'bg-orange-50 border-orange-200'
          };

          return (
            <div 
              key={item.label}
              className={`grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border ${
                bgColorClasses[item.color as keyof typeof bgColorClasses]
              }`}
            >
              <span className="text-sm sm:text-base font-semibold text-gray-900">
                {item.label}
              </span>
              <span className={`text-right text-sm sm:text-base font-bold ${
                colorClasses[item.color as keyof typeof colorClasses]
              }`}>
                {formatCurrency(item.current)}
              </span>
              <span className={`text-right text-sm sm:text-base font-bold ${
                colorClasses[item.color as keyof typeof colorClasses]
              }`}>
                {formatCurrency(item.estimated)}
                <div className="flex items-center justify-end mt-1 hidden sm:flex">
                  <TrendingUp size={12} className="mr-1" />
                  <span className="text-xs">
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
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Análise Rápida</h4>
        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
          <p>
            • Base de cálculo: {estimateData.daysElapsed} dias decorridos de {estimateData.totalDays} dias no período
          </p>
          <p className="hidden sm:block">
            • Média diária de receita: {formatCurrency(estimateData.daysElapsed > 0 ? estimateData.currentRevenue / estimateData.daysElapsed : 0)}
          </p>
          <p className="hidden sm:block">
            • Média diária de despesas: {formatCurrency(estimateData.daysElapsed > 0 ? estimateData.currentExpenses / estimateData.daysElapsed : 0)}
          </p>
          <p className={`font-medium ${
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