import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { CashFlowData } from '../../types'; // Ensure CashFlowData type is updated
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign } from 'lucide-react';
import { Database } from '../../types/supabase'; // Import Database type for Transaction and Category

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];

const CashFlowPanel: React.FC = () => {
  const { supabase, profile } = useAuth();
  const { isMobile, isTablet } = useDeviceDetection();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]); // State for categories
  const [expandedDate, setExpandedDate] = React.useState<string | null>(null); // State for expanded date

  React.useEffect(() => {
    loadTransactions();
  }, [profile]);

  const loadTransactions = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        setCategories([]); // Clear categories too
        return;
      }


      const [transactionsRes, categoriesRes] = await Promise.all([ // Fetch categories as well
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('status', ['concluida', 'pago', 'recebido', 'concluída'])
          .order('data_transacao', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true)
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error; // Handle category error
      
      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []); // Set categories
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return 'Sem Categoria';
    const category = categories.find(c => c.id === id);
    return category?.nome || 'Desconhecida';
  };

  const cashFlowData = useMemo((): CashFlowData[] => {
    // Agrupa transações por data
    const transactionsByDate = transactions
      .reduce((acc, transaction) => {
        const dateKey = transaction.data_transacao;
        if (!acc[dateKey]) { // Initialize with dailyTransactions array
          acc[dateKey] = { income: 0, expenses: 0, dailyTransactions: [] };
        }
        
        if (transaction.tipo === 'receita') {
          acc[dateKey].income += transaction.valor;
        } else {
          acc[dateKey].expenses += transaction.valor;
        }
        acc[dateKey].dailyTransactions.push(transaction); // Store individual transactions
        
        return acc;
      }, {} as Record<string, { income: number; expenses: number; dailyTransactions: Transaction[] }>);

    // Converte para array e calcula saldo acumulado
    let cumulativeBalance = 0;
    return Object.entries(transactionsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const dailyBalance = data.income - data.expenses;
        cumulativeBalance += dailyBalance;
        
        return {
          date,
          income: data.income,
          expenses: data.expenses,
          balance: cumulativeBalance,
          dailyTransactions: data.dailyTransactions // Pass the transactions
        };
      });
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toggleExpanded = (date: string) => {
    setExpandedDate(prev => (prev === date ? null : date));
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const totals = useMemo(() => {
    return cashFlowData.reduce((acc, day) => ({
      income: acc.income + day.income,
      expenses: acc.expenses + day.expenses,
      balance: day.balance // último balance é o saldo final
    }), { income: 0, expenses: 0, balance: 0 });
  }, [cashFlowData]);

  return (
    <div className="card-premium rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-8 hover-lift relative overflow-hidden animate-slide-in-from-right">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 via-blue-50/40 to-teal-50/60 rounded-2xl sm:rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-6 left-6 w-20 h-20 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-teal-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 min-w-0">
          <div className="p-3 bg-gradient-to-br from-green-500 via-blue-600 to-teal-600 rounded-2xl shadow-xl hover-glow animate-scale-in">
            <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-sm sm:text-xl font-black bg-gradient-to-r from-gray-900 via-green-900 to-blue-900 bg-clip-text text-transparent tracking-tight truncate">
            Fluxo de Caixa
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-right relative z-10 glass rounded-xl px-3 sm:px-4 py-2 font-semibold animate-slide-in-from-right">
          <span className="hidden sm:inline">Todas as </span>Movimentações
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8 relative z-10">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-green-300 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in touch-target">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-base font-black text-green-800 tracking-wider uppercase truncate">Total Entradas</p>
              <p className="text-lg sm:text-3xl font-black text-green-900 drop-shadow-lg tracking-tight break-all">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl shadow-xl hover-glow flex-shrink-0">
              <TrendingUp className="text-white drop-shadow-lg" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-red-300 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in stagger-1 touch-target">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-base font-black text-red-800 tracking-wider uppercase truncate">Total Saídas</p>
              <p className="text-lg sm:text-3xl font-black text-red-900 drop-shadow-lg tracking-tight break-all">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl sm:rounded-2xl shadow-xl hover-glow flex-shrink-0">
              <TrendingDown className="text-white drop-shadow-lg" size={20} />
            </div>
          </div>
        </div>

        <div className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in stagger-2 touch-target ${
          totals.balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' 
            : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className={`text-sm sm:text-base font-black tracking-wider uppercase ${
                totals.balance >= 0 ? 'text-blue-800' : 'text-orange-800'
              } truncate`}>
                Saldo Líquido
              </p>
              <p className={`text-lg sm:text-3xl font-black tracking-tight drop-shadow-lg ${
                totals.balance >= 0 ? 'text-blue-900' : 'text-orange-900'
              } break-all`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl hover-glow flex-shrink-0 ${
              totals.balance >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-yellow-600'
            }`}>
              <DollarSign className="text-white drop-shadow-lg" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Detalhamento por Data */}
      <div className={`relative z-10 ${
        isMobile ? 'max-h-[500px]' : 'max-h-[700px]'
      } overflow-hidden`}>
        {/* Tabela Real com Alinhamento Perfeito */}
        <div className="overflow-y-auto custom-scrollbar mobile-scroll max-h-full">
          <table className="w-full">
            {/* Header da Tabela */}
            <thead className="sticky top-0 z-30 bg-gradient-to-r from-white/95 to-slate-50/95 backdrop-blur-lg shadow-lg">
              <tr>
                <th className="text-left p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40">
                  Data
                </th>
                <th className="text-right p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40">
                  Entradas
                </th>
                <th className="text-right p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40">
                  Saídas
                </th>
                <th className="text-right p-4 font-black text-gray-800 text-sm lg:text-base border-b-2 border-white/40">
                  Saldo
                </th>
              </tr>
            </thead>
            
            {/* Body da Tabela */}
            <tbody>
              {cashFlowData.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`text-center text-gray-600 font-semibold animate-fade-in ${
                    isMobile ? 'py-8 text-sm' : 'py-12 text-base'
                  }`}>
                    Nenhuma movimentação encontrada
                  </td>
                </tr>
              ) : (
                cashFlowData.slice(isMobile ? -7 : -14).map((day) => (
                  <React.Fragment key={day.date}>
                    <tr>
                      <td colSpan={4} className="p-0">
                        <button
                          onClick={() => toggleExpanded(day.date)}
                          className="w-full hover:bg-gradient-to-r hover:from-white/60 hover:to-slate-50/60 transition-smooth hover:shadow-xl backdrop-blur-sm group interactive-card relative z-20 touch-target no-select"
                        >
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td className="text-left p-4 w-1/4">
                                  <div className="font-black text-gray-900 flex items-center space-x-2">
                                    <div className={`p-1.5 rounded-lg transition-all duration-300 shadow-md ${
                                      expandedDate === day.date ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-white/80 text-gray-600 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white'
                                    }`}>
                                      {expandedDate === day.date ? <Minus size={12} /> : <Plus size={12} />}
                                    </div>
                                    <span className="text-sm font-black">{formatDate(day.date)}</span>
                                  </div>
                                </td>
                                <td className="text-right p-4 w-1/4">
                                  <span className={`font-black tracking-tight text-sm lg:text-base ${
                                    day.income > 0 ? 'text-green-600' : 'text-gray-400'
                                  }`}>
                                    {day.income > 0 ? formatCurrency(day.income) : '-'}
                                  </span>
                                </td>
                                <td className="text-right p-4 w-1/4">
                                  <span className={`font-black tracking-tight text-sm lg:text-base ${
                                    day.expenses > 0 ? 'text-red-600' : 'text-gray-400'
                                  }`}>
                                    {day.expenses > 0 ? formatCurrency(day.expenses) : '-'}
                                  </span>
                                </td>
                                <td className="text-right p-4 w-1/4">
                                  <span className={`font-black tracking-tight text-sm lg:text-base ${
                                    day.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                                  } drop-shadow-lg`}>
                                    {formatCurrency(day.balance)}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </button>
                      </td>
                    </tr>

                    {expandedDate === day.date && (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <div className={`border-l-4 border-blue-400 space-y-2 animate-slide-in-left bg-gradient-to-r from-blue-50/90 to-purple-50/60 shadow-inner backdrop-blur-sm overflow-y-auto mobile-scroll ${
                            isMobile ? 'ml-4 pl-4 py-3 max-h-48' : 'ml-8 pl-6 py-4 max-h-60'
                          } relative z-10`}>
                            {day.dailyTransactions
                              .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
                              .map((transaction) => (
                                <div key={transaction.id} className={`flex justify-between items-center text-gray-800 bg-white/90 rounded-lg shadow-md hover:shadow-lg transition-smooth border border-white/60 hover:bg-white/95 backdrop-blur-sm touch-target ${
                                  isMobile ? 'text-xs p-3' : 'text-base p-4'
                                } relative z-30`}>
                                  <span className="flex-1 truncate mr-2">
                                    <span className="font-semibold">{transaction.descricao}</span>
                                    <span className="text-gray-600 text-xs block">
                                      {getCategoryName(transaction.id_categoria)}
                                    </span>
                                  </span>
                                  <span className={`font-bold flex-shrink-0 drop-shadow-lg ${
                                    transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                                  } text-sm`}>
                                    {`${transaction.tipo === 'despesa' ? '-' : ''}${formatCurrency(transaction.valor)}`}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashFlowPanel;