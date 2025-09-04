import React, { useMemo } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { TrendingUp, TrendingDown, Target, Eye, X } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface BusinessForecastPanelProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}

interface ForecastDetail {
  transaction: Transaction;
  categoryName: string;
  pessoaName?: string;
}

const BusinessForecastPanel: React.FC<BusinessForecastPanelProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const { isMobile, isTablet } = useDeviceDetection();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [pessoas, setPessoas] = React.useState<Pessoa[]>([]);
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
        setPessoas([]);
        return;
      }

      const [transactionsRes, categoriesRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .gte('data_vencimento', dateFilter.startDate)
          .lte('data_vencimento', dateFilter.endDate),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true),
        supabase
          .from('pessoas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true)
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (pessoasRes.error) throw pessoasRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setPessoas(pessoasRes.data || []);
    } catch (error) {
      console.error('Error loading business forecast data:', error);
    }
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return '-';
    const category = categories.find(c => c.id === id);
    return category?.nome || '-';
  };

  const getPessoaName = (id: string | null) => {
    if (!id) return '-';
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome_razao_social || '-';
  };

  const forecastData = useMemo(() => {
    // TOTAL A RECEBER = Receitas recebidas + Receitas pendentes
    const receitasRecebidas = transactions
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido', 'concluída'].includes(t.status))
      .reduce((sum, t) => sum + t.valor, 0);

    const receitasPendentes = transactions
      .filter(t => t.tipo === 'receita' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalReceber = receitasRecebidas + receitasPendentes;

    // TOTAL DESPESAS = Despesas pagas + Despesas pendentes
    const despesasPagas = transactions
      .filter(t => t.tipo === 'despesa' && ['concluida', 'pago', 'concluída'].includes(t.status))
      .reduce((sum, t) => sum + t.valor, 0);

    const despesasPendentes = transactions
      .filter(t => t.tipo === 'despesa' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.valor, 0);

    const totalDespesas = despesasPagas + despesasPendentes;

    // PREVISÃO DO NEGÓCIO = Total a Receber - Total Despesas
    const previsaoNegocio = totalReceber - totalDespesas;

    // Detalhes para os modais
    const receitasDetalhes: ForecastDetail[] = transactions
      .filter(t => t.tipo === 'receita' && ['concluida', 'pago', 'recebido', 'concluída', 'pendente'].includes(t.status))
      .map(t => ({
        transaction: t,
        categoryName: getCategoryName(t.id_categoria),
        pessoaName: getPessoaName(t.id_pessoa)
      }))
      .sort((a, b) => new Date(b.transaction.data_vencimento || b.transaction.data_transacao).getTime() - 
                     new Date(a.transaction.data_vencimento || a.transaction.data_transacao).getTime());

    const despesasDetalhes: ForecastDetail[] = transactions
      .filter(t => t.tipo === 'despesa' && ['concluida', 'pago', 'concluída', 'pendente'].includes(t.status))
      .map(t => ({
        transaction: t,
        categoryName: getCategoryName(t.id_categoria),
        pessoaName: getPessoaName(t.id_pessoa)
      }))
      .sort((a, b) => new Date(b.transaction.data_vencimento || b.transaction.data_transacao).getTime() - 
                     new Date(a.transaction.data_vencimento || a.transaction.data_transacao).getTime());

    return {
      receitasRecebidas,
      receitasPendentes,
      totalReceber,
      despesasPagas,
      despesasPendentes,
      totalDespesas,
      previsaoNegocio,
      receitasDetalhes,
      despesasDetalhes
    };
  }, [transactions, categories, pessoas]);

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

  const formatDateFromString = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className={`card-premium shadow-2xl border border-white/30 hover-lift relative overflow-hidden animate-slide-in-up ${
      isMobile ? 'rounded-2xl p-4' : 'rounded-3xl p-8'
    }`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-blue-50/60 ${
        isMobile ? 'rounded-2xl' : 'rounded-3xl'
      }`} />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-28 h-28 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl animate-float" />
      <div className="absolute bottom-4 left-4 w-20 h-20 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className={`rounded-2xl shadow-xl hover-glow animate-scale-in ${
            forecastData.previsaoNegocio >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-orange-500 to-red-600'
          } ${isMobile ? 'p-2' : 'p-3'}`}>
            <Target className={`text-white drop-shadow-lg ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          <div>
            <h3 className={`font-black bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent tracking-tight ${
              isMobile ? 'text-base' : 'text-xl'
            }`}>
              Previsão do Negócio
            </h3>
            <p className={`text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-bold tracking-wide ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {isMobile ? 'Receitas - Despesas' : 'Total a Receber - Total Despesas'}
            </p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-right relative z-10 glass rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-2 font-semibold animate-slide-in-from-right">
          {formatDateFromString(dateFilter.startDate)} - {formatDateFromString(dateFilter.endDate)}
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
                  <h3 className="text-xl font-semibold text-gray-900">Detalhes das Receitas</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(forecastData.totalReceber)} • {forecastData.receitasDetalhes.length} transação(ões)
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
                    <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                    <th className="text-left p-4 font-medium text-gray-600">Status</th>
                    <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.receitasDetalhes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma receita encontrada no período
                      </td>
                    </tr>
                  ) : (
                    forecastData.receitasDetalhes.map((item) => (
                      <tr key={item.transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900 whitespace-nowrap">
                          {formatDate(item.transaction.data_vencimento || item.transaction.data_transacao)}
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900 truncate">{item.transaction.descricao}</p>
                            <p className="text-sm text-gray-500">ID: {item.transaction.id_sequencial}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900 truncate block max-w-32">
                            {item.transaction.nome_razao_social || item.pessoaName}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ['concluida', 'pago', 'recebido', 'concluída'].includes(item.transaction.status) 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {['concluida', 'pago', 'recebido', 'concluída'].includes(item.transaction.status) ? 'Recebido' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-green-600 whitespace-nowrap">
                          {formatCurrency(item.transaction.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {forecastData.receitasDetalhes.length > 0 && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Total das Receitas:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(forecastData.totalReceber)}
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
                  <h3 className="text-xl font-semibold text-gray-900">Detalhes das Despesas</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(forecastData.totalDespesas)} • {forecastData.despesasDetalhes.length} transação(ões)
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
                    <th className="text-left p-4 font-medium text-gray-600">Fornecedor</th>
                    <th className="text-left p-4 font-medium text-gray-600">Status</th>
                    <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.despesasDetalhes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma despesa encontrada no período
                      </td>
                    </tr>
                  ) : (
                    forecastData.despesasDetalhes.map((item) => (
                      <tr key={item.transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900 whitespace-nowrap">
                          {formatDate(item.transaction.data_vencimento || item.transaction.data_transacao)}
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900 truncate">{item.transaction.descricao}</p>
                            <p className="text-sm text-gray-500">ID: {item.transaction.id_sequencial}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900 truncate block max-w-32">
                            {item.transaction.nome_razao_social || item.pessoaName}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ['concluida', 'pago', 'concluída'].includes(item.transaction.status) 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {['concluida', 'pago', 'concluída'].includes(item.transaction.status) ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-red-600 whitespace-nowrap">
                          {formatCurrency(item.transaction.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {forecastData.despesasDetalhes.length > 0 && (
              <div className="p-4 bg-red-50 border-t border-red-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-900">Total das Despesas:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(forecastData.totalDespesas)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Previsão do Negócio - Destaque Principal */}
        <div className={`border-3 shadow-2xl hover:shadow-3xl transition-all duration-500 hover-lift relative overflow-hidden animate-scale-in ${
          forecastData.previsaoNegocio >= 0 
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
            : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300'
        } ${isMobile ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'}`}>
          <div className={`absolute inset-0 ${
            forecastData.previsaoNegocio >= 0 
              ? 'bg-gradient-to-r from-green-600/5 to-emerald-600/5' 
              : 'bg-gradient-to-r from-orange-600/5 to-red-600/5'
          }`} />
          <div className="text-center relative z-10">
            <p className={`font-black tracking-wider uppercase ${
              forecastData.previsaoNegocio >= 0 ? 'text-green-800' : 'text-orange-800'
            } ${isMobile ? 'text-sm' : 'text-lg'}`}>
              Previsão do Negócio
            </p>
            <p className={`font-black tracking-tight drop-shadow-xl ${
              forecastData.previsaoNegocio >= 0 ? 'text-green-900' : 'text-orange-900'
            } ${isMobile ? 'text-3xl' : 'text-6xl'}`}>
              {formatCurrency(forecastData.previsaoNegocio)}
            </p>
            <p className={`font-bold tracking-wide ${
              forecastData.previsaoNegocio >= 0 ? 'text-green-700' : 'text-orange-700'
            } ${isMobile ? 'text-xs mt-2' : 'text-sm mt-3'}`}>
              {forecastData.previsaoNegocio >= 0 ? 'Resultado positivo esperado' : 'Resultado negativo esperado'}
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
                  Total a Receber
                </p>
                <p className={`font-black text-green-900 tracking-tight drop-shadow-lg ${
                  isMobile ? 'text-lg' : 'text-3xl'
                }`}>
                  {formatCurrency(forecastData.totalReceber)}
                </p>
                <div className={`space-y-1 ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
                  <p className="text-green-700 font-bold">
                    Recebido: {formatCurrency(forecastData.receitasRecebidas)}
                  </p>
                  <p className="text-yellow-700 font-bold">
                    Pendente: {formatCurrency(forecastData.receitasPendentes)}
                  </p>
                </div>
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
                  Total Despesas
                </p>
                <p className={`font-black text-red-900 tracking-tight drop-shadow-lg ${
                  isMobile ? 'text-lg' : 'text-3xl'
                }`}>
                  {formatCurrency(forecastData.totalDespesas)}
                </p>
                <div className={`space-y-1 ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
                  <p className="text-red-700 font-bold">
                    Pago: {formatCurrency(forecastData.despesasPagas)}
                  </p>
                  <p className="text-yellow-700 font-bold">
                    Pendente: {formatCurrency(forecastData.despesasPendentes)}
                  </p>
                </div>
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
          <p className={`text-gray-700 dark:text-gray-300 text-center font-bold tracking-wide ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}>
            <strong>Fórmula:</strong> Total a Receber (recebido + pendente) - Total Despesas (pago + pendente) = Previsão do Negócio
          </p>
        </div>

        {/* Breakdown Detalhado */}
        <div className={`glass shadow-lg border border-white/30 relative z-10 animate-slide-in-up ${
          isMobile ? 'p-4 rounded-xl' : 'p-6 rounded-2xl'
        }`}>
          <h4 className={`font-black text-gray-900 mb-4 tracking-wide ${
            isMobile ? 'text-sm' : 'text-lg'
          }`}>
            📊 Breakdown Detalhado
          </h4>
          <div className={`grid grid-cols-1 gap-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800 font-bold">Receitas Recebidas:</span>
              <span className="font-black text-green-600">{formatCurrency(forecastData.receitasRecebidas)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-800 font-bold">Receitas Pendentes:</span>
              <span className="font-black text-yellow-600">{formatCurrency(forecastData.receitasPendentes)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-red-800 font-bold">Despesas Pagas:</span>
              <span className="font-black text-red-600">-{formatCurrency(forecastData.despesasPagas)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-orange-800 font-bold">Despesas Pendentes:</span>
              <span className="font-black text-orange-600">-{formatCurrency(forecastData.despesasPendentes)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessForecastPanel;