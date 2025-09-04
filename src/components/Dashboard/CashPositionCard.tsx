import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
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
  const { isMobile, isTablet } = useDeviceDetection();
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


      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('status', ['concluida', 'pago', 'recebido', 'concluída'])
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

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading cash position data:', error);
    }
  };

  const cashPosition = useMemo(() => {
    // RECEITAS PAGAS/RECEBIDAS
    const receitasPagas = transactions
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido', 'concluída'].includes(t.status))
      .reduce((sum, t) => sum + t.valor, 0);

    // DESPESAS PAGAS (TODAS AS DESPESAS PAGAS)
    const despesasPagas = transactions
      .filter(t => {
        return t.tipo === 'despesa' && ['concluida', 'pago', 'concluída'].includes(t.status);
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
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido', 'concluída'].includes(t.status))
      .sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime());
  }, [transactions]);

  const despesasDetalhe = useMemo(() => {
    return transactions
      .filter(t => {
        return t.tipo === 'despesa' && ['concluida', 'pago', 'concluída'].includes(t.status);
      })
      .sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime());
  }, [transactions, categories]);

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={`card-premium shadow-2xl border border-white/30 hover-lift relative overflow-hidden animate-slide-in-up ${
      isMobile ? 'rounded-2xl p-4' : 'rounded-3xl p-8'
    }`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-cyan-50/60 via-blue-50/40 to-indigo-50/60 ${
        isMobile ? 'rounded-2xl' : 'rounded-3xl'
      }`} />
      
      {/* Floating elements */}
      <div className="absolute top-4 left-4 w-24 h-24 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '1s' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className={`rounded-full ${
            cashPosition.caixaAtual >= 0 ? 'bg-blue-50' : 'bg-orange-50'
          } shadow-xl hover-glow animate-scale-in ${
            isMobile ? 'p-2' : 'p-3'
          }`}>
            <Wallet className={`${
              cashPosition.caixaAtual >= 0 ? 'text-blue-600' : 'text-orange-600'
            } drop-shadow-lg ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          <div>
            <h3 className={`font-black bg-gradient-to-r from-gray-900 via-cyan-900 to-blue-900 bg-clip-text text-transparent tracking-tight ${
              isMobile ? 'text-base' : 'text-xl'
            }`}>
              Caixa Atual
            </h3>
            <p className={`text-gray-700 dark:text-gray-300 font-bold tracking-wide ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {isMobile ? 'Receitas - Despesas' : 'Receitas pagas - Despesas pagas'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes das Receitas */}
      {showReceitasDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`bg-white shadow-xl w-full overflow-hidden ${
            isMobile ? 'rounded-lg max-h-[90vh] max-w-full mx-2' : 'rounded-xl max-w-4xl max-h-[80vh]'
          }`}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`bg-white shadow-xl w-full overflow-hidden ${
            isMobile ? 'rounded-lg max-h-[90vh] max-w-full mx-2' : 'rounded-xl max-w-4xl max-h-[80vh]'
          }`}>
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
        <div className={`border-3 shadow-2xl hover:shadow-3xl transition-all duration-500 hover-lift relative overflow-hidden animate-scale-in ${
          cashPosition.caixaAtual >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' 
            : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
        } ${isMobile ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'}`}>
          <div className={`absolute inset-0 ${
            cashPosition.caixaAtual >= 0 
              ? 'bg-gradient-to-r from-blue-600/5 to-indigo-600/5' 
              : 'bg-gradient-to-r from-orange-600/5 to-yellow-600/5'
          }`} />
          <div className="text-center">
            <p className={`font-black tracking-wider uppercase ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-800' : 'text-orange-800'
            } ${isMobile ? 'text-sm' : 'text-lg'}`}>
              Saldo em Caixa
            </p>
            <p className={`font-black tracking-tight drop-shadow-xl ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-900' : 'text-orange-900'
            } ${isMobile ? 'text-3xl' : 'text-6xl'}`}>
              {formatCurrency(cashPosition.caixaAtual)}
            </p>
            <p className={`font-bold tracking-wide ${
              cashPosition.caixaAtual >= 0 ? 'text-blue-700' : 'text-orange-700'
            } ${isMobile ? 'text-xs mt-2' : 'text-sm mt-3'}`}>
              {cashPosition.caixaAtual >= 0 ? 'Posição positiva' : 'Posição negativa'}
            </p>
          </div>
        </div>

        {/* Detalhamento */}
        <div className="grid grid-cols-2 gap-6 relative z-10">
          <button
            onClick={() => setShowReceitasDetail(true)}
            className={`bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 hover:bg-gradient-to-br hover:from-green-100 hover:to-emerald-100 transition-all duration-500 text-left group shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-left ${
              isMobile ? 'p-4 rounded-xl' : 'p-6 rounded-2xl'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-black text-green-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-base'
                }`}>
                  Receitas Pagas
                </p>
                <p className={`font-black text-green-900 tracking-tight drop-shadow-lg ${
                  isMobile ? 'text-lg' : 'text-3xl'
                }`}>
                  {formatCurrency(cashPosition.receitasPagas)}
                </p>
                <p className={`text-green-700 font-bold ${
                  isMobile ? 'text-xs mt-1' : 'text-sm mt-2'
                }`}>
                  {receitasDetalhe.length} transação(ões) {!isMobile && '• Clique para detalhes'}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="text-green-600 drop-shadow-lg" size={isMobile ? 20 : 24} />
                {!isMobile && <Eye className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={18} />}
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowDespesasDetail(true)}
            className={`bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 hover:bg-gradient-to-br hover:from-red-100 hover:to-pink-100 transition-all duration-500 text-left group shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-right ${
              isMobile ? 'p-4 rounded-xl' : 'p-6 rounded-2xl'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-black text-red-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-base'
                }`}>
                  Custos Pagos
                </p>
                <p className={`font-black text-red-900 tracking-tight drop-shadow-lg ${
                  isMobile ? 'text-lg' : 'text-3xl'
                }`}>
                  {formatCurrency(cashPosition.despesasPagas)}
                </p>
                <p className={`text-red-700 font-bold ${
                  isMobile ? 'text-xs mt-1' : 'text-sm mt-2'
                }`}>
                  {despesasDetalhe.length} transação(ões) {!isMobile && '• Clique para detalhes'}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingDown className="text-red-600 drop-shadow-lg" size={isMobile ? 20 : 24} />
                {!isMobile && <Eye className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" size={18} />}
              </div>
            </div>
          </button>
        </div>

        {/* Fórmula */}
        <div className={`glass shadow-lg border border-white/30 relative z-10 animate-slide-in-up ${
          isMobile ? 'p-3 rounded-xl' : 'p-5 rounded-2xl'
        }`}>
          <p className={`text-gray-700 text-center font-bold tracking-wide ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}>
            <strong>Fórmula:</strong> Receitas (pagas/recebidas) - Despesas (pagas) = Caixa Atual
          </p>
        </div>
      </div>
    </div>
  );
};

export default CashPositionCard;