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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const totals = useMemo(() => {
    return cashFlowData.reduce((acc, day) => ({
      income: acc.income + day.income,
      expenses: acc.expenses + day.expenses,
      balance: day.balance // último balance é o saldo final
    }), { income: 0, expenses: 0, balance: 0 });
  }, [cashFlowData]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Fluxo de Caixa
        </h3>
        <div className="text-xs sm:text-sm text-gray-500 text-right">
          Todas as Movimentações
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-green-800">Total Entradas</p>
              <p className="text-lg sm:text-2xl font-bold text-green-900">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <TrendingUp className="text-green-600" size={20} />
          </div>
        </div>

        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-red-800">Total Saídas</p>
              <p className="text-lg sm:text-2xl font-bold text-red-900">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={20} />
          </div>
        </div>

        <div className={`p-3 sm:p-4 rounded-lg border ${
          totals.balance >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
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
          </div>
        </div>
      </div>

      {/* Detalhamento por Data */}
      <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-600 pb-2 border-b border-gray-200">
          <span>Data</span>
          <span className="text-right">Entradas</span>
          <span className="text-right">Saídas</span>
          <span className="text-right">Saldo</span>
        </div>

        {cashFlowData.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500 text-sm">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          cashFlowData.slice(-30).map((day) => (
            <React.Fragment key={day.date}>
              <button
                onClick={() => toggleExpanded(day.date)}
                className="w-full grid grid-cols-4 gap-2 sm:gap-4 py-2 sm:py-3 px-1 sm:px-2 rounded-lg hover:bg-gray-50 text-xs sm:text-sm text-left"
              >
                <span className="font-medium text-gray-900 flex items-center space-x-1">
                  {expandedDate === day.date ? <Minus size={14} /> : <Plus size={14} />}
                  <span>{formatDate(day.date)}</span>
                </span>
                <span className="text-right font-semibold text-green-600">
                  {day.income > 0 ? formatCurrency(day.income) : '-'}
                </span>
                <span className="text-right font-semibold text-red-600">
                  {day.expenses > 0 ? formatCurrency(day.expenses) : '-'}
                </span>
                <span className={`text-right font-bold ${
                  day.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {formatCurrency(day.balance)}
                </span>
              </button>

              {expandedDate === day.date && (
                <div className="ml-4 sm:ml-6 border-l border-gray-200 pl-2 sm:pl-4 py-1 space-y-1">
                  {day.dailyTransactions
                    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()) // Sort by creation time
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-xs sm:text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        <span className="flex-1 truncate">
                          {transaction.descricao} ({getCategoryName(transaction.id_categoria)})
                        </span>
                        <span className={`font-medium ${
                          transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                        }`}>
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