import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, Filter, Calendar } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type TransactionInsert = Database['public']['Tables']['transacoes']['Insert'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Client = Database['public']['Tables']['clientes']['Row'];
type Supplier = Database['public']['Tables']['fornecedores']['Row'];

const TransactionsManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    tipo: 'all',
    status: 'all',
    categoria: 'all',
    periodo: 'all'
  });
  const [formData, setFormData] = useState<Partial<TransactionInsert>>({
    valor: 0,
    tipo: 'receita',
    descricao: '',
    data_transacao: new Date().toISOString().split('T')[0],
    id_categoria: '',
    id_cliente: '',
    id_fornecedor: '',
    status: 'concluida',
    origem: 'manual',
    observacoes: '',
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        setCategories([]);
        setClients([]);
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const [transactionsRes, categoriesRes, clientsRes, suppliersRes] = await Promise.all([
        supabase.from('transacoes').select('*').eq('id_empresa', profile.id_empresa).order('data_transacao', { ascending: false }),
        supabase.from('categorias').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome'),
        supabase.from('clientes').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome'),
        supabase.from('fornecedores').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome')
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setClients(clientsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa) return;

    try {
      const transactionData = {
        ...formData,
        id_empresa: profile.id_empresa,
        valor: Number(formData.valor),
        id_categoria: formData.id_categoria || null,
        id_cliente: formData.id_cliente || null,
        id_fornecedor: formData.id_fornecedor || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert(transactionData);

        if (error) throw error;
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      valor: transaction.valor,
      tipo: transaction.tipo,
      descricao: transaction.descricao,
      data_transacao: transaction.data_transacao,
      id_categoria: transaction.id_categoria || '',
      id_cliente: transaction.id_cliente || '',
      id_fornecedor: transaction.id_fornecedor || '',
      status: transaction.status,
      origem: transaction.origem,
      observacoes: transaction.observacoes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      valor: 0,
      tipo: 'receita',
      descricao: '',
      data_transacao: new Date().toISOString().split('T')[0],
      id_categoria: '',
      id_cliente: '',
      id_fornecedor: '',
      status: 'concluida',
      origem: 'manual',
      observacoes: '',
    });
    setEditingTransaction(null);
    setShowForm(false);
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

  const getClientName = (id: string | null) => {
    if (!id) return '-';
    const client = clients.find(c => c.id === id);
    return client?.nome || '-';
  };

  const getSupplierName = (id: string | null) => {
    if (!id) return '-';
    const supplier = suppliers.find(s => s.id === id);
    return supplier?.nome || '-';
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(transaction.id_categoria).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filters.tipo === 'all' || transaction.tipo === filters.tipo;
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    const matchesCategory = filters.categoria === 'all' || transaction.id_categoria === filters.categoria;

    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const totals = filteredTransactions.reduce((acc, transaction) => {
    if (transaction.status === 'concluida') {
      if (transaction.tipo === 'receita') {
        acc.receitas += transaction.valor;
      } else if (transaction.tipo === 'despesa') {
        acc.despesas += transaction.valor;
      }
    }
    return acc;
  }, { receitas: 0, despesas: 0 });

  const saldo = totals.receitas - totals.despesas;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transações Financeiras</h1>
            <p className="text-gray-600">Gerencie receitas e despesas</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Transação</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Receitas</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totals.receitas)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Despesas</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totals.despesas)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <TrendingDown className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Líquido</p>
              <p className={`text-3xl font-bold ${
                saldo >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {formatCurrency(saldo)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'
            }`}>
              <DollarSign className={
                saldo >= 0 ? 'text-blue-600' : 'text-orange-600'
              } size={24} />
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
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.tipo}
            onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="concluida">Concluída</option>
            <option value="pendente">Pendente</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nome} ({category.tipo})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Data</th>
                <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                <th className="text-left p-4 font-medium text-gray-600">Categoria</th>
                <th className="text-left p-4 font-medium text-gray-600">Tipo</th>
                <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-center p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Nenhuma transação encontrada</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-gray-900">
                      {formatDate(transaction.data_transacao)}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">{transaction.descricao}</p>
                        <p className="text-sm text-gray-500">ID: {transaction.id_sequencial}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {getCategoryName(transaction.id_categoria)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center space-x-1 ${
                        transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.tipo === 'receita' ? (
                          <TrendingUp size={16} />
                        ) : (
                          <TrendingDown size={16} />
                        )}
                        <span className="capitalize">
                          {transaction.tipo}
                        </span>
                      </span>
                    </td>
                    <td className={`p-4 text-right font-semibold ${
                      transaction.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(transaction.valor)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        transaction.status === 'concluida'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'pendente'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status === 'concluida' ? 'Concluída' :
                         transaction.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.tipo || ''}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'receita' | 'despesa' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.valor || ''}
                    onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.descricao || ''}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_transacao || ''}
                    onChange={(e) => setFormData({ ...formData, data_transacao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pessoa
                  </label>
                  <select
                    value={formData.id_pessoa || ''}
                    onChange={(e) => setFormData({ ...formData, id_pessoa: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma pessoa</option>
                    {pessoas
                      .filter(pessoa => {
                        if (formData.tipo === 'receita') {
                          return pessoa.tipo_cadastro === 'cliente';
                        } else if (formData.tipo === 'despesa') {
                          return ['fornecedor', 'colaborador', 'outro'].includes(pessoa.tipo_cadastro);
                        }
                        return true;
                      })
                      .map(pessoa => (
                        <option key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome_razao_social} ({pessoa.tipo_cadastro})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.id_categoria || ''}
                    onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories
                      .filter(cat => cat.tipo === formData.tipo)
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.nome}
                          {category.tipo === 'despesa' && category.classificacao_dre && 
                            ` (${category.classificacao_dre.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())})`
                          }
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pendente' | 'concluida' | 'cancelada' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="concluida">Concluída</option>
                    <option value="pendente">Pendente</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTransaction ? 'Atualizar' : 'Criar'} Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsManager;