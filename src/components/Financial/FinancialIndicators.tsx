import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { AlertTriangle, TrendingDown, TrendingUp, Calendar, Filter, Eye, X } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface OverdueDetail {
  transaction: Transaction;
  categoryName: string;
  pessoaName?: string;
  daysOverdue: number;
}

const FinancialIndicators: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [overduePayables, setOverduePayables] = useState<OverdueDetail[]>([]);
  const [overdueReceivables, setOverdueReceivables] = useState<OverdueDetail[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayablesDetail, setShowPayablesDetail] = useState(false);
  const [showReceivablesDetail, setShowReceivablesDetail] = useState(false);
  const [filters, setFilters] = useState({
    payables: {
      periodo: 'all',
      categoria: 'all',
      pessoa: 'all'
    },
    receivables: {
      periodo: 'all',
      categoria: 'all',
      pessoa: 'all'
    }
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setCategories([]);
        setPessoas([]);
        setLoading(false);
        return;
      }

      const [categoriesRes, pessoasRes] = await Promise.all([
        supabase.from('categorias').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome'),
        supabase.from('pessoas').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome_razao_social')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (pessoasRes.error) throw pessoasRes.error;

      setCategories(categoriesRes.data || []);
      setPessoas(pessoasRes.data || []);

      await loadOverdueData();
    } catch (error) {
      console.error('Error loading financial indicators data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverdueData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setOverduePayables([]);
        setOverdueReceivables([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Carregar contas a pagar vencidas
      const { data: payablesData, error: payablesError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('tipo', 'despesa')
        .eq('status', 'pendente')
        .lt('data_vencimento', today);

      if (payablesError) throw payablesError;

      // Carregar contas a receber vencidas
      const { data: receivablesData, error: receivablesError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('tipo', 'receita')
        .eq('status', 'pendente')
        .lt('data_vencimento', today);

      if (receivablesError) throw receivablesError;

      // Processar dados das contas a pagar vencidas
      const processedPayables = (payablesData || []).map(transaction => ({
        transaction,
        categoryName: getCategoryName(transaction.id_categoria),
        pessoaName: getPessoaName(transaction.id_pessoa),
        daysOverdue: getDaysOverdue(transaction.data_vencimento || transaction.data_transacao)
      }));

      // Processar dados das contas a receber vencidas
      const processedReceivables = (receivablesData || []).map(transaction => ({
        transaction,
        categoryName: getCategoryName(transaction.id_categoria),
        pessoaName: getPessoaName(transaction.id_pessoa),
        daysOverdue: getDaysOverdue(transaction.data_vencimento || transaction.data_transacao)
      }));

      setOverduePayables(processedPayables);
      setOverdueReceivables(processedReceivables);
    } catch (error) {
      console.error('Error loading overdue data:', error);
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  const getFilteredPayables = () => {
    return overduePayables.filter(item => {
      const matchesCategory = filters.payables.categoria === 'all' || item.transaction.id_categoria === filters.payables.categoria;
      const matchesPessoa = filters.payables.pessoa === 'all' || item.transaction.id_pessoa === filters.payables.pessoa;
      
      let matchesPeriod = true;
      if (filters.payables.periodo === '7days') {
        matchesPeriod = item.daysOverdue <= 7;
      } else if (filters.payables.periodo === '30days') {
        matchesPeriod = item.daysOverdue <= 30;
      } else if (filters.payables.periodo === '90days') {
        matchesPeriod = item.daysOverdue <= 90;
      }

      return matchesCategory && matchesPessoa && matchesPeriod;
    });
  };

  const getFilteredReceivables = () => {
    return overdueReceivables.filter(item => {
      const matchesCategory = filters.receivables.categoria === 'all' || item.transaction.id_categoria === filters.receivables.categoria;
      const matchesPessoa = filters.receivables.pessoa === 'all' || item.transaction.id_pessoa === filters.receivables.pessoa;
      
      let matchesPeriod = true;
      if (filters.receivables.periodo === '7days') {
        matchesPeriod = item.daysOverdue <= 7;
      } else if (filters.receivables.periodo === '30days') {
        matchesPeriod = item.daysOverdue <= 30;
      } else if (filters.receivables.periodo === '90days') {
        matchesPeriod = item.daysOverdue <= 90;
      }

      return matchesCategory && matchesPessoa && matchesPeriod;
    });
  };

  const totalOverduePayables = overduePayables.reduce((sum, item) => sum + item.transaction.valor, 0);
  const totalOverdueReceivables = overdueReceivables.reduce((sum, item) => sum + item.transaction.valor, 0);

  const filteredPayables = getFilteredPayables();
  const filteredReceivables = getFilteredReceivables();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-8 w-8 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indicadores Financeiros</h1>
          <p className="text-gray-600">Acompanhe valores vencidos e indicadores críticos</p>
        </div>
      </div>

      {/* Main Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contas a Pagar Vencidas */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowPayablesDetail(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-50 rounded-full">
                <TrendingDown className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contas a Pagar Vencidas</h3>
                <p className="text-sm text-gray-600">{overduePayables.length} conta(s) vencida(s)</p>
              </div>
            </div>
            <Eye className="text-gray-400" size={20} />
          </div>
          
          <div className="text-center">
            <p className="text-4xl font-bold text-red-600 mb-2">
              {formatCurrency(totalOverduePayables)}
            </p>
            <p className="text-sm text-gray-600">
              Clique para ver detalhes
            </p>
          </div>

          {overduePayables.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Mais antiga:</span>
                <span className="font-medium">
                  {Math.max(...overduePayables.map(p => p.daysOverdue))} dias
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Contas a Receber Vencidas */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowReceivablesDetail(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-50 rounded-full">
                <TrendingUp className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contas a Receber Vencidas</h3>
                <p className="text-sm text-gray-600">{overdueReceivables.length} conta(s) vencida(s)</p>
              </div>
            </div>
            <Eye className="text-gray-400" size={20} />
          </div>
          
          <div className="text-center">
            <p className="text-4xl font-bold text-orange-600 mb-2">
              {formatCurrency(totalOverdueReceivables)}
            </p>
            <p className="text-sm text-gray-600">
              Clique para ver detalhes
            </p>
          </div>

          {overdueReceivables.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Mais antiga:</span>
                <span className="font-medium">
                  {Math.max(...overdueReceivables.map(r => r.daysOverdue))} dias
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payables Detail Modal */}
      {showPayablesDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Contas a Pagar Vencidas - Detalhamento
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(totalOverduePayables)} em {overduePayables.length} conta(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowPayablesDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <select
                  value={filters.payables.periodo}
                  onChange={(e) => setFilters({
                    ...filters,
                    payables: { ...filters.payables, periodo: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Todos os períodos</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="90days">Últimos 90 dias</option>
                </select>

                <select
                  value={filters.payables.categoria}
                  onChange={(e) => setFilters({
                    ...filters,
                    payables: { ...filters.payables, categoria: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.filter(c => c.tipo === 'despesa').map(category => (
                    <option key={category.id} value={category.id}>
                      {category.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.payables.fornecedor}
                  onChange={(e) => setFilters({
                    ...filters,
                    payables: { ...filters.payables, fornecedor: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">Todos os fornecedores</option>
                  {pessoas.filter(p => p.tipo_cadastro === 'fornecedor').map(pessoa => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome_razao_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                      <th className="text-left p-4 font-medium text-gray-600">Fornecedor</th>
                      <th className="text-left p-4 font-medium text-gray-600">Categoria</th>
                      <th className="text-left p-4 font-medium text-gray-600">Vencimento</th>
                      <th className="text-left p-4 font-medium text-gray-600">Dias em Atraso</th>
                      <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          Nenhuma conta a pagar vencida encontrada com os filtros aplicados
                        </td>
                      </tr>
                    ) : (
                      filteredPayables
                        .sort((a, b) => b.daysOverdue - a.daysOverdue)
                        .map((item) => (
                          <tr key={item.transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">{item.transaction.descricao}</p>
                                <p className="text-sm text-gray-500">ID: {item.transaction.id_sequencial}</p>
                              </div>
                            </td>
                            <td className="p-4 text-gray-900">
                              {item.transaction.nome_razao_social || item.pessoaName}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                {item.categoryName}
                              </span>
                            </td>
                            <td className="p-4 text-gray-900">
                              {formatDate(item.transaction.data_vencimento || item.transaction.data_transacao)}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                {item.daysOverdue} dias
                              </span>
                            </td>
                            <td className="p-4 text-right font-semibold text-red-600">
                              {formatCurrency(item.transaction.valor)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredPayables.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-red-900">Total Filtrado:</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(filteredPayables.reduce((sum, item) => sum + item.transaction.valor, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receivables Detail Modal */}
      {showReceivablesDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Contas a Receber Vencidas - Detalhamento
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Total: {formatCurrency(totalOverdueReceivables)} em {overdueReceivables.length} conta(s)
                  </p>
                </div>
                <button
                  onClick={() => setShowReceivablesDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Filters */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <select
                  value={filters.receivables.periodo}
                  onChange={(e) => setFilters({
                    ...filters,
                    receivables: { ...filters.receivables, periodo: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">Todos os períodos</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="90days">Últimos 90 dias</option>
                </select>

                <select
                  value={filters.receivables.categoria}
                  onChange={(e) => setFilters({
                    ...filters,
                    receivables: { ...filters.receivables, categoria: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.filter(c => c.tipo === 'receita').map(category => (
                    <option key={category.id} value={category.id}>
                      {category.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.receivables.pessoa}
                  onChange={(e) => setFilters({
                    ...filters,
                    receivables: { ...filters.receivables, pessoa: e.target.value }
                  })}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">Todos os clientes</option>
                  {pessoas.filter(p => p.tipo_cadastro === 'cliente').map(pessoa => (
                    <option key={pessoa.id} value={pessoa.id}>
                      {pessoa.nome_razao_social}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                      <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                      <th className="text-left p-4 font-medium text-gray-600">Categoria</th>
                      <th className="text-left p-4 font-medium text-gray-600">Vencimento</th>
                      <th className="text-left p-4 font-medium text-gray-600">Dias em Atraso</th>
                      <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivables.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          Nenhuma conta a receber vencida encontrada com os filtros aplicados
                        </td>
                      </tr>
                    ) : (
                      filteredReceivables
                        .sort((a, b) => b.daysOverdue - a.daysOverdue)
                        .map((item) => (
                          <tr key={item.transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">{item.transaction.descricao}</p>
                                <p className="text-sm text-gray-500">ID: {item.transaction.id_sequencial}</p>
                              </div>
                            </td>
                            <td className="p-4 text-gray-900">
                              {item.transaction.nome_razao_social || item.pessoaName}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                {item.categoryName}
                              </span>
                            </td>
                            <td className="p-4 text-gray-900">
                              {formatDate(item.transaction.data_vencimento || item.transaction.data_transacao)}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                {item.daysOverdue} dias
                              </span>
                            </td>
                            <td className="p-4 text-right font-semibold text-orange-600">
                              {formatCurrency(item.transaction.valor)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredReceivables.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-orange-900">Total Filtrado:</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(filteredReceivables.reduce((sum, item) => sum + item.transaction.valor, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialIndicators;