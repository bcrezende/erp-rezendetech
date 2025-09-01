import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Wallet, TrendingUp, TrendingDown, Eye, X } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];

interface CashPositionCardProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}

const CashPositionCard: React.FC<CashPositionCardProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [showReceitasDetail, setShowReceitasDetail] = React.useState(false);
  const [showDespesasDetail, setShowDespesasDetail] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        setCategories([]);
        return;
      }

      console.log('🔍 Loading cash position data for period:', dateFilter);

      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('status', ['concluida', 'pago', 'recebido'])
          .gte('data_transacao', dateFilter.startDate)
          .lte('data_transacao', dateFilter.endDate),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true)
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      console.log('📊 Cash position data loaded:', {
        transacoes: transactionsRes.data?.length || 0,
        periodo: `${dateFilter.startDate} até ${dateFilter.endDate}`,
        dados: transactionsRes.data
      });
      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading cash position data:', error);
    }
  };

  const cashPosition = useMemo(() => {
    // RECEITAS PAGAS/RECEBIDAS
    const receitasPagas = transactions
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido'].includes(t.status))
      .reduce((sum, t) => sum + t.valor, 0);

    // DESPESAS PAGAS (TODAS AS DESPESAS PAGAS)
    const despesasPagas = transactions
      .filter(t => {
        return t.tipo === 'despesa' && ['concluida', 'pago'].includes(t.status);
      })
      .reduce((sum, t) => sum + t.valor, 0);

    // CAIXA ATUAL = RECEITAS PAGAS - DESPESAS PAGAS
    const caixaAtual = receitasPagas - despesasPagas;

    return {
      receitasPagas,
      despesasPagas,
      caixaAtual
    };
  }, [transactions, categories]);

  const receitasDetalhe = useMemo(() => {
    return transactions
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido'].includes(t.status))
      .sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime());
  }, [transactions]);

  const despesasDetalhe = useMemo(() => {
    return transactions
      .filter(t => {
        return t.tipo === 'despesa' && ['concluida', 'pago'].includes(t.status);
      })
      .sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime());
  }, [transactions, categories]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={`p-3 rounded-full ${
            cashPosition.caixaAtual >= 0 ? 'bg-blue-50' : 'bg-orange-50'
          }`}>
            <Wallet className={`h-6 w-6 ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Caixa Atual</h3>
            <p className="text-xs sm:text-sm text-gray-600">Receitas pagas - Despesas pagas</p>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes das Receitas */}
      {showReceitasDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Detalhes das Receitas Recebidas</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(cashPosition.receitasPagas)} • {receitasDetalhe.length} transação(ões)
                  </p>
                </div>
                <button
                  onClick={() => setShowReceitasDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Data</th>
                    <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                    <th className="text-left p-4 font-medium text-gray-600">Pessoa</th>
                    <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {receitasDetalhe.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhuma receita recebida no período
                      </td>
                    </tr>
                  ) : (
                    receitasDetalhe.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900 whitespace-nowrap">
                          {formatDate(transaction.data_transacao)}
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900 truncate">{transaction.descricao}</p>
                            <p className="text-sm text-gray-500">ID: {transaction.id_sequencial}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900 truncate block max-w-32">
                            {transaction.nome_razao_social || '-'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-green-600 whitespace-nowrap">
                          {formatCurrency(transaction.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {receitasDetalhe.length > 0 && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Total das Receitas Recebidas:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(cashPosition.receitasPagas)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes das Despesas */}
      {showDespesasDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Detalhes dos Custos Pagos</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(cashPosition.despesasPagas)} • {despesasDetalhe.length} transação(ões)
                  </p>
                </div>
                <button
                  onClick={() => setShowDespesasDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-600">Data</th>
                    <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                    <th className="text-left p-4 font-medium text-gray-600">Pessoa</th>
                    <th className="text-left p-4 font-medium text-gray-600">Classificação</th>
                    <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {despesasDetalhe.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma despesa paga no período
                      </td>
                    </tr>
                  ) : (
                    despesasDetalhe.map((transaction) => {
                      const categoria = categories.find(c => c.id === transaction.id_categoria);
                      const classificacao = categoria?.classificacao_dre || 'despesa_operacional';
                      
                      return (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4 text-gray-900 whitespace-nowrap">
                            {formatDate(transaction.data_transacao)}
                          </td>
                          <td className="p-4">
                            <div className="max-w-xs">
                              <p className="font-medium text-gray-900 truncate">{transaction.descricao}</p>
                              <p className="text-sm text-gray-500">ID: {transaction.id_sequencial}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-900 truncate block max-w-32">
                              {transaction.nome_razao_social || '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              classificacao === 'custo_fixo' ? 'bg-red-100 text-red-700' :
                              classificacao === 'custo_variavel' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {classificacao === 'custo_fixo' ? 'Fixo' :
                               classificacao === 'custo_variavel' ? 'Variável' :
                               'Operacional'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold text-red-600 whitespace-nowrap">
                            {formatCurrency(transaction.valor)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {despesasDetalhe.length > 0 && (
              <div className="p-4 bg-red-50 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-900">Total dos Custos Pagos:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(cashPosition.despesasPagas)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="space-y-4">
        {/* Caixa Atual - Destaque */}
        <div className={`p-4 rounded-lg border-2 ${
          cashPosition.caixaAtual >= 0 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="text-center">
            <p className={`text-sm font-medium ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-800' : 'text-orange-800'
            }`}>
              Saldo em Caixa
            </p>
            <p className={`text-4xl font-bold ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-900' : 'text-orange-900'
            }`}>
              {formatCurrency(cashPosition.caixaAtual)}
            </p>
            <p className={`text-xs mt-1 ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              {cashPosition.caixaAtual >= 0 ? 'Posição positiva' : 'Posição negativa'}
            </p>
          </div>
        </div>

        {/* Detalhamento */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowReceitasDetail(true)}
            className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Receitas Pagas</p>
                <p className="text-xl font-bold text-green-900">
                  {formatCurrency(cashPosition.receitasPagas)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {receitasDetalhe.length} transação(ões) • Clique para detalhes
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="text-green-600" size={20} />
                <Eye className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowDespesasDetail(true)}
            className="bg-red-50 p-4 rounded-lg border border-red-200 hover:bg-red-100 transition-colors text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Custos Pagos</p>
                <p className="text-xl font-bold text-red-900">
                  {formatCurrency(cashPosition.despesasPagas)}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {despesasDetalhe.length} transação(ões) • Clique para detalhes
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingDown className="text-red-600" size={20} />
                <Eye className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
              </div>
            </div>
          </button>
        </div>

        {/* Fórmula */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            <strong>Fórmula:</strong> Receitas (pagas/recebidas) - Despesas (pagas) = Caixa Atual
          </p>
        </div>
      </div>
    </div>
  );
};

export default CashPositionCard;