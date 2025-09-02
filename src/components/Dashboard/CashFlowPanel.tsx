import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { CashFlowData } from '../../types'; // Ensure CashFlowData type is updated
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign } from 'lucide-react';
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
    <div className="card-premium rounded-3xl shadow-2xl border border-white/30 p-6 sm:p-8 hover-lift relative overflow-hidden animate-slide-in-from-right">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/60 via-blue-50/40 to-teal-50/60 rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-6 left-6 w-20 h-20 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-teal-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className="p-3 bg-gradient-to-br from-green-500 via-blue-600 to-teal-600 rounded-2xl shadow-xl hover-glow animate-scale-in">
            <TrendingUp className="h-7 w-7 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-lg sm:text-xl font-black bg-gradient-to-r from-gray-900 via-green-900 to-blue-900 bg-clip-text text-transparent tracking-tight">
            Fluxo de Caixa
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-right relative z-10 glass rounded-xl px-4 py-2 font-semibold animate-slide-in-from-right">
          Todas as Movimentações
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 relative z-10">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6 rounded-2xl border-2 border-green-300 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base font-black text-green-800 tracking-wider uppercase">Total Entradas</p>
              <p className="text-2xl sm:text-3xl font-black text-green-900 drop-shadow-lg tracking-tight">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl hover-glow">
              <TrendingUp className="text-white drop-shadow-lg" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 sm:p-6 rounded-2xl border-2 border-red-300 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base font-black text-red-800 tracking-wider uppercase">Total Saídas</p>
              <p className="text-2xl sm:text-3xl font-black text-red-900 drop-shadow-lg tracking-tight">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl hover-glow">
              <TrendingDown className="text-white drop-shadow-lg" size={24} />
            </div>
          </div>
        </div>

        <div className={`p-4 sm:p-6 rounded-2xl border-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift interactive-card animate-scale-in stagger-2 ${
          totals.balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' 
            : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm sm:text-base font-black tracking-wider uppercase ${
                totals.balance >= 0 ? 'text-blue-800' : 'text-orange-800'
              }`}>
                Saldo Líquido
              </p>
              <p className={`text-2xl sm:text-3xl font-black tracking-tight drop-shadow-lg ${
                totals.balance >= 0 ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {formatCurrency(totals.balance)}
              </p>
            </div>
            <div className={`p-3 rounded-2xl shadow-xl hover-glow ${
              totals.balance >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-500 to-yellow-600'
            }`}>
              <DollarSign className="text-white drop-shadow-lg" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Detalhamento por Data */}
      <div className="space-y-3 max-h-60 sm:max-h-80 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-sm sm:text-base font-black text-gray-800 pb-4 border-b-2 border-white/40 bg-gradient-to-r from-white/70 to-slate-50/70 rounded-xl p-4 sticky top-0 backdrop-blur-lg shadow-lg">
          <span>Data</span>
          <span className="text-right">Entradas</span>
          <span className="text-right">Saídas</span>
          <span className="text-right">Saldo</span>
        </div>

        {cashFlowData.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-600 text-base font-semibold animate-fade-in">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          cashFlowData.slice(-30).map((day) => (
            <React.Fragment key={day.date}>
              <button
                onClick={() => toggleExpanded(day.date)}
                className="w-full grid grid-cols-4 gap-2 sm:gap-4 py-3 sm:py-4 px-3 sm:px-4 rounded-xl hover:bg-gradient-to-r hover:from-white/60 hover:to-slate-50/60 text-sm sm:text-base text-left transition-smooth hover:shadow-xl backdrop-blur-sm group interactive-card"
              >
                <span className="font-black text-gray-900 flex items-center space-x-2">
                  <div className={`p-2 rounded-xl transition-all duration-300 shadow-md ${
                    expandedDate === day.date ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-white/80 text-gray-600 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white'
                  }`}>
                    {expandedDate === day.date ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                  <span>{formatDate(day.date)}</span>
                </span>
                <span className="text-right font-black text-green-600 drop-shadow-lg">
                  {day.income > 0 ? formatCurrency(day.income) : '-'}
                </span>
                <span className="text-right font-black text-red-600 drop-shadow-lg">
                  {day.expenses > 0 ? formatCurrency(day.expenses) : '-'}
                </span>
                <span className={`text-right font-black ${
                  day.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                } drop-shadow-lg`}>
                  {formatCurrency(day.balance)}
                </span>
              </button>

              {expandedDate === day.date && (
                <div className="ml-6 sm:ml-8 border-l-4 border-gradient-to-b from-blue-400 to-purple-600 pl-4 sm:pl-6 py-2 space-y-2 animate-slide-in-left bg-gradient-to-r from-blue-50/60 to-transparent rounded-r-xl">
                  {day.dailyTransactions
                    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()) // Sort by creation time
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-sm sm:text-base text-gray-800 glass p-4 rounded-xl shadow-lg hover:shadow-xl transition-smooth border border-white/40 hover-lift">
                        <span className="flex-1 truncate">
                          {transaction.descricao} ({getCategoryName(transaction.id_categoria)})
                        </span>
                        <span className={`font-black ${
                          transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                        } drop-shadow-lg`}>
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