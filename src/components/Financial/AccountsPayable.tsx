import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { CreditCard, Search, Calendar, AlertTriangle, DollarSign, User, Tag, Eye, X, Filter } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

const AccountsPayable: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    categoria: 'all',
    pessoa: 'all',
    periodo: 'all',
    status: 'all' // Adicionado filtro de status
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        console.log('❌ AccountsPayable: No profile or company ID found', { profile });
        setTransactions([]);
        setCategories([]);
        setPessoas([]);
        setLoading(false);
        return;
      }

      console.log('🔍 AccountsPayable: Loading data for company:', profile.id_empresa);

      const [transactionsRes, categoriesRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'despesa')
          .order('data_vencimento', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'despesa')
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('pessoas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('tipo_cadastro', ['fornecedor', 'colaborador', 'outro'])
          .eq('ativo', true)
          .order('nome_razao_social')
      ]);

      if (transactionsRes.error) {
        console.error('❌ AccountsPayable: Error loading transactions:', transactionsRes.error);
        throw transactionsRes.error;
      }
      if (categoriesRes.error) {
        console.error('❌ AccountsPayable: Error loading categories:', categoriesRes.error);
        throw categoriesRes.error;
      }
      if (pessoasRes.error) {
        console.error('❌ AccountsPayable: Error loading pessoas:', pessoasRes.error);
        throw pessoasRes.error;
      }

      console.log('✅ AccountsPayable: Raw data loaded:', {
        allTransactions: transactionsRes.data?.length || 0,
        categories: categoriesRes.data?.length || 0,
        pessoas: pessoasRes.data?.length || 0,
        transactionsData: transactionsRes.data,
        query: {
          table: 'transacoes',
          filters: { 
            id_empresa: profile.id_empresa,
            tipo: 'despesa'
          }
        }
      });

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setPessoas(pessoasRes.data || []);
    } catch (error) {
      console.error('❌ AccountsPayable: Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-700',
      pago: 'bg-green-100 text-green-700',
      concluida: 'bg-green-100 text-green-700',
      vencido: 'bg-red-100 text-red-700',
      cancelado: 'bg-gray-100 text-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendente: 'Pendente',
      pago: 'Pago',
      concluida: 'Concluída',
      vencido: 'Vencido',
      cancelado: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const isOverdue = (transaction: Transaction) => {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = transaction.data_vencimento || transaction.data_transacao;
    return dueDate < today && transaction.status === 'pendente';
  };

  const getDaysOverdue = (transaction: Transaction) => {
    const today = new Date();
    const dueDate = new Date(transaction.data_vencimento || transaction.data_transacao);
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(transaction.id_categoria).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getPessoaName(transaction.id_pessoa).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.nome_razao_social && transaction.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         transaction.id_sequencial?.toString().includes(searchTerm);
    
    const matchesCategory = filters.categoria === 'all' || transaction.id_categoria === filters.categoria;
    const matchesPessoa = filters.pessoa === 'all' || transaction.id_pessoa === filters.pessoa;
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    
    let matchesPeriod = true;
    if (filters.periodo === 'vencidas') {
      matchesPeriod = isOverdue(transaction);
    } else if (filters.periodo === 'hoje') {
      const today = new Date().toISOString().split('T')[0];
      const dueDate = transaction.data_vencimento || transaction.data_transacao;
      matchesPeriod = dueDate === today;
    } else if (filters.periodo === 'proximos7') {
      const today = new Date();
      const dueDate = new Date(transaction.data_vencimento || transaction.data_transacao);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      matchesPeriod = diffDays >= 0 && diffDays <= 7;
    }

    return matchesSearch && matchesCategory && matchesPessoa && matchesStatus && matchesPeriod;
  });

  console.log('🔍 AccountsPayable: Filtering results:', {
    totalTransactions: transactions.length,
    filteredTransactions: filteredTransactions.length,
    filters,
    searchTerm,
    sampleTransactions: transactions.slice(0, 2).map(t => ({
      id: t.id_sequencial,
      descricao: t.descricao,
      status: t.status,
      valor: t.valor,
      data_vencimento: t.data_vencimento,
      id_empresa: t.id_empresa
    }))
  });

  const totals = filteredTransactions.reduce((acc, transaction) => {
    acc.total += transaction.valor;
    if (isOverdue(transaction)) {
      acc.overdue += transaction.valor;
      acc.overdueCount += 1;
    }
    if (transaction.status === 'pendente') {
      acc.pending += transaction.valor;
      acc.pendingCount += 1;
    }
    return acc;
  }, { total: 0, overdue: 0, overdueCount: 0, pending: 0, pendingCount: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando contas a pagar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <CreditCard className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-600">Gerencie suas despesas e pagamentos</p>
        </div>
      </div>

      {/* Debug Info - Sempre visível para diagnóstico */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">🔍 Debug Info - Contas a Pagar</h4>
        <div className="text-sm text-yellow-800 space-y-1">
          <p>• Total de despesas carregadas: {transactions.length}</p>
          <p>• Despesas após filtros: {filteredTransactions.length}</p>
          <p>• Empresa ID: {profile?.id_empresa}</p>
          <p>• Usuário ID: {profile?.id}</p>
          <p>• Categorias de despesa: {categories.length}</p>
          <p>• Fornecedores/Pessoas: {pessoas.length}</p>
          <p>• Filtros ativos: {JSON.stringify(filters)}</p>
          <p>• Termo de busca: "{searchTerm}"</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Ver primeiras 3 despesas do banco</summary>
            <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(transactions.slice(0, 3).map(t => ({
                id: t.id_sequencial,
                descricao: t.descricao,
                status: t.status,
                valor: t.valor,
                data_transacao: t.data_transacao,
                data_vencimento: t.data_vencimento,
                id_empresa: t.id_empresa,
                tipo: t.tipo
              })), null, 2)}
            </pre>
          </details>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totals.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredTransactions.length} conta(s)
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <CreditCard className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(totals.overdue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totals.overdueCount} conta(s)
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCurrency(totals.pending)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totals.pendingCount} conta(s)
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Calendar className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar contas a pagar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="concluida">Concluída</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nome}
              </option>
            ))}
          </select>

          <select
            value={filters.pessoa}
            onChange={(e) => setFilters({ ...filters, pessoa: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os fornecedores</option>
            {pessoas.map(pessoa => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome_razao_social}
              </option>
            ))}
          </select>

          <select
            value={filters.periodo}
            onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os períodos</option>
            <option value="vencidas">Vencidas</option>
            <option value="hoje">Vencem hoje</option>
            <option value="proximos7">Próximos 7 dias</option>
          </select>

          <button
            onClick={() => {
              setFilters({
                categoria: 'all',
                pessoa: 'all',
                periodo: 'all',
                status: 'all'
              });
              setSearchTerm('');
              console.log('🔄 AccountsPayable: Filters cleared, reloading data...');
              loadData();
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Accounts Payable Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">#</th>
                <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                <th className="text-left p-4 font-medium text-gray-600">Fornecedor</th>
                <th className="text-left p-4 font-medium text-gray-600">Categoria</th>
                <th className="text-left p-4 font-medium text-gray-600">Vencimento</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                <th className="text-center p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium">
                      {transactions.length === 0 ? 'Nenhuma despesa encontrada' : 'Nenhuma despesa corresponde aos filtros'}
                    </p>
                    <p className="text-sm">
                      {transactions.length === 0 
                        ? 'Vá para "Transações" para criar uma nova despesa' 
                        : 'Tente ajustar os filtros ou limpar a busca'
                      }
                    </p>
                    {transactions.length > 0 && (
                      <button
                        onClick={() => {
                          setFilters({
                            categoria: 'all',
                            pessoa: 'all',
                            periodo: 'all',
                            status: 'all'
                          });
                          setSearchTerm('');
                          console.log('🔄 AccountsPayable: Clearing filters from empty state...');
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      isOverdue(transaction) ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-4 font-medium text-gray-900">
                      #{transaction.id_sequencial}
                    </td>
                    <td className="p-4">
                      <div className="max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{transaction.descricao}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.origem === 'whatsapp_ia' ? '🤖 WhatsApp IA' : 
                           transaction.origem === 'api' ? '🔗 API' : '✏️ Manual'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900 truncate block max-w-32">
                        {transaction.nome_razao_social || getPessoaName(transaction.id_pessoa)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {getCategoryName(transaction.id_categoria)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className={`font-medium ${
                          isOverdue(transaction) ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {formatDate(transaction.data_vencimento || transaction.data_transacao)}
                        </p>
                        {isOverdue(transaction) && (
                          <p className="text-xs text-red-600 font-medium">
                            {getDaysOverdue(transaction)} dias em atraso
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-red-600">
                      {formatCurrency(transaction.valor)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setViewingTransaction(transaction)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Transaction Modal */}
      {viewingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Conta a Pagar #{viewingTransaction.id_sequencial}
                </h2>
                <button
                  onClick={() => setViewingTransaction(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Descrição</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingTransaction.descricao}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Valor</label>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(viewingTransaction.valor)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingTransaction.status)}`}>
                    {getStatusLabel(viewingTransaction.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data de Vencimento</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(viewingTransaction.data_vencimento || viewingTransaction.data_transacao)}
                  </p>
                  {isOverdue(viewingTransaction) && (
                    <p className="text-sm text-red-600 font-medium">
                      ⚠️ {getDaysOverdue(viewingTransaction)} dias em atraso
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Fornecedor</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingTransaction.nome_razao_social || getPessoaName(viewingTransaction.id_pessoa)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Categoria</label>
                  <p className="text-lg font-semibold text-gray-900">{getCategoryName(viewingTransaction.id_categoria)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data da Transação</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingTransaction.data_transacao)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Origem</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingTransaction.origem === 'whatsapp_ia' ? '🤖 WhatsApp IA' : 
                     viewingTransaction.origem === 'api' ? '🔗 API' : '✏️ Manual'}
                  </p>
                </div>
              </div>

              {viewingTransaction.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTransaction.observacoes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Criado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingTransaction.criado_em).toLocaleDateString('pt-BR')} às {new Date(viewingTransaction.criado_em).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Atualizado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingTransaction.atualizado_em).toLocaleDateString('pt-BR')} às {new Date(viewingTransaction.atualizado_em).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayable;