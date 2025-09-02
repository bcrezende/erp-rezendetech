import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { CashFlowData } from '../../types'; // Ensure CashFlowData type is updated
import { TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { Database } from '../../types/supabase'; // Import Database type for Transaction and Category

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];

const CashFlowPanel: React.FC = () => {
  const { supabase, profile } = useAuth();
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

      console.log('🔍 Loading cash flow transactions');

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
      
      console.log('📊 Cash flow transactions loaded:', transactionsRes.data?.length || 0, 'transactions');
      
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
    <div className="card-modern rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover-lift relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 rounded-2xl" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Fluxo de Caixa
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-500 text-right relative z-10 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1">
          Todas as Movimentações
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 relative z-10">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 sm:p-4 rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-bold text-green-800 tracking-wide">Total Entradas</p>
              <p className="text-lg sm:text-2xl font-bold text-green-900 drop-shadow-sm">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="p-2 bg-green-500 rounded-xl shadow-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-3 sm:p-4 rounded-xl border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-bold text-red-800 tracking-wide">Total Saídas</p>
              <p className="text-lg sm:text-2xl font-bold text-red-900 drop-shadow-sm">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div className="p-2 bg-red-500 rounded-xl shadow-lg">
              <TrendingDown className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg border ${
          totals.balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' 
            : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs sm:text-sm font-medium ${
                totals.balance >= 0 ? 'text-blue-800' : 'text-orange-800'
              }`}>
                Saldo Líquido
              </p>
              <p className={`text-lg sm:text-2xl font-bold ${
                totals.balance >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className={`p-2 rounded-xl shadow-lg ${
              totals.balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <DollarSign className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Detalhamento por Data */}
      <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto relative z-10">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-gray-700 pb-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-2 sticky top-0 backdrop-blur-sm">
          <span>Data</span>
          <span className="text-right">Entradas</span>
          <span className="text-right">Saídas</span>
          <span className="text-right">Saldo</span>
        </div>

        {cashFlowData.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500 text-sm animate-fade-in">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          cashFlowData.slice(-30).map((day) => (
            <React.Fragment key={day.date}>
              <button
                onClick={() => toggleExpanded(day.date)}
                className="w-full grid grid-cols-4 gap-2 sm:gap-4 py-2 sm:py-3 px-1 sm:px-2 rounded-xl hover:bg-gradient-to-r hover:from-white/80 hover:to-slate-50/80 text-xs sm:text-sm text-left transition-all duration-200 hover:shadow-md backdrop-blur-sm group"
              >
                <span className="font-bold text-gray-900 flex items-center space-x-1">
                  <div className={`p-1 rounded-lg transition-all duration-200 ${
                    expandedDate === day.date ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                  }`}>
                    {expandedDate === day.date ? <Minus size={12} /> : <Plus size={12} />}
                  </div>
                  <span>{formatDate(day.date)}</span>
                </span>
                <span className="text-right font-bold text-green-600 drop-shadow-sm">
                  {day.income > 0 ? formatCurrency(day.income) : '-'}
                </span>
                <span className="text-right font-bold text-red-600 drop-shadow-sm">
                  {day.expenses > 0 ? formatCurrency(day.expenses) : '-'}
                </span>
                <span className={`text-right font-bold ${
                  day.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                } drop-shadow-sm`}>
                  {formatCurrency(day.balance)}
                </span>
              </button>

              {expandedDate === day.date && (
                <div className="ml-4 sm:ml-6 border-l-2 border-blue-200 pl-2 sm:pl-4 py-1 space-y-1 animate-slide-in-left bg-gradient-to-r from-blue-50/50 to-transparent rounded-r-lg">
                  {day.dailyTransactions
                    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()) // Sort by creation time
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-xs sm:text-sm text-gray-700 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100">
                        <span className="flex-1 truncate">
                          {transaction.descricao} ({getCategoryName(transaction.id_categoria)})
                        </span>
                        <span className={`font-bold ${
                          transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                        } drop-shadow-sm`}>
                          {transaction.tipo === 'despesa' ? '-' : ''}{formatCurrency(transaction.valor)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default CashFlowPanel;