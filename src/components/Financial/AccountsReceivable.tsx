import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, Calendar, DollarSign, Clock, AlertCircle, Eye, X, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type TransactionInsert = Database['public']['Tables']['transacoes']['Insert'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

type SortColumn = 'id_sequencial' | 'descricao' | 'cliente' | 'categoria' | 'data_transacao' | 'data_vencimento' | 'valor' | 'status';
type SortDirection = 'asc' | 'desc';
type DeleteScope = 'single' | 'future' | 'all';

const AccountsReceivable: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('data_vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteScope, setDeleteScope] = useState<DeleteScope>('single');
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Função para obter o primeiro e último dia do mês atual
  const getCurrentMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  };

  const [filters, setFilters] = useState(() => {
    const monthRange = getCurrentMonthRange();
    return {
      status: 'all',
      categoria: 'all',
      pessoa: 'all',
      periodo: 'all',
      startDate: monthRange.startDate,
      endDate: monthRange.endDate
    };
  });

  const [formData, setFormData] = useState<Partial<TransactionInsert>>({
    valor: 0,
    tipo: 'receita',
    descricao: '',
    data_transacao: new Date().toISOString().split('T')[0],
    data_vencimento: new Date().toISOString().split('T')[0],
    id_categoria: '',
    id_pessoa: '',
    status: 'pendente',
    origem: 'manual',
    observacoes: '',
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile, filters.startDate, filters.endDate]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        setCategories([]);
        setPessoas([]);
        setLoading(false);
        return;
      }

      const [transactionsRes, categoriesRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'receita')
          .gte('data_vencimento', filters.startDate)
          .lte('data_vencimento', filters.endDate)
          .order('data_vencimento', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'receita')
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('pessoas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo_cadastro', 'cliente')
          .eq('ativo', true)
          .order('nome_razao_social')
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (pessoasRes.error) throw pessoasRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setPessoas(pessoasRes.data || []);
    } catch (error) {
      console.error('Error loading accounts receivable data:', error);
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
        tipo: 'receita',
        id_categoria: formData.id_categoria || null,
        id_pessoa: formData.id_pessoa || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        alert('Conta a receber atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert(transactionData);

        if (error) throw error;
        alert('Conta a receber criada com sucesso!');
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving account receivable:', error);
      alert('Erro ao salvar conta a receber. Tente novamente.');
    }
  };

  const handleStatusChange = async (transactionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('transacoes')
        .update({ status: newStatus })
        .eq('id', transactionId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status da conta.');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      valor: transaction.valor,
      tipo: 'receita',
      descricao: transaction.descricao,
      data_transacao: transaction.data_transacao,
      data_vencimento: transaction.data_vencimento || transaction.data_transacao,
      id_categoria: transaction.id_categoria || '',
      id_pessoa: transaction.id_pessoa || '',
      status: transaction.status,
      origem: transaction.origem,
      observacoes: transaction.observacoes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const transaction = transactions.find(t => t.id === id);

    if (!transaction) return;

    const isInstallment = transaction.e_recorrente &&
                         transaction.tipo_recorrencia === 'parcelada' &&
                         transaction.id_grupo_parcelas;

    if (isInstallment) {
      setTransactionToDelete(transaction);
      setDeleteScope('single');
      setShowDeleteModal(true);
    } else {
      if (!confirm('Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.')) return;

      try {
        const { error } = await supabase
          .from('transacoes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await loadData();
        alert('Conta a receber excluída com sucesso!');
      } catch (error) {
        console.error('Error deleting account receivable:', error);
        alert('Erro ao excluir conta a receber. Tente novamente.');
      }
    }
  };

  const handleDeleteInstallmentsByScope = async () => {
    if (!transactionToDelete) return;

    try {
      if (deleteScope === 'single') {
        const { error } = await supabase
          .from('transacoes')
          .delete()
          .eq('id', transactionToDelete.id);

        if (error) throw error;
        alert('Parcela excluída com sucesso!');
      } else if (deleteScope === 'future') {
        const { error } = await supabase
          .from('transacoes')
          .delete()
          .eq('id_grupo_parcelas', transactionToDelete.id_grupo_parcelas)
          .gte('parcela_atual', transactionToDelete.parcela_atual || 0);

        if (error) throw error;
        alert('Parcelas futuras excluídas com sucesso!');
      } else if (deleteScope === 'all') {
        const { error } = await supabase
          .from('transacoes')
          .delete()
          .eq('id_grupo_parcelas', transactionToDelete.id_grupo_parcelas);

        if (error) throw error;
        alert('Todas as parcelas excluídas com sucesso!');
      }

      await loadData();
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting installments:', error);
      alert('Erro ao excluir parcela(s). Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      valor: 0,
      tipo: 'receita',
      descricao: '',
      data_transacao: new Date().toISOString().split('T')[0],
      data_vencimento: new Date().toISOString().split('T')[0],
      id_categoria: '',
      id_pessoa: '',
      status: 'pendente',
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
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    return date.toLocaleDateString('pt-BR');
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
      recebido: 'bg-green-100 text-green-700',
      vencido: 'bg-red-100 text-red-700',
      cancelado: 'bg-gray-100 text-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendente: 'Pendente',
      recebido: 'Recebido',
      vencido: 'Vencido',
      cancelado: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'pendente') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate + 'T12:00:00');
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(transaction.id_categoria).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getPessoaName(transaction.id_pessoa).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id_sequencial?.toString().includes(searchTerm);
    
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    const matchesCategory = filters.categoria === 'all' || transaction.id_categoria === filters.categoria;
    const matchesPessoa = filters.pessoa === 'all' || transaction.id_pessoa === filters.pessoa;
    
    let matchesPeriod = true;
    if (filters.periodo === 'vencidas') {
      matchesPeriod = isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status);
    } else if (filters.periodo === 'hoje') {
      const today = new Date().toISOString().split('T')[0];
      matchesPeriod = (transaction.data_vencimento || transaction.data_transacao) === today;
    } else if (filters.periodo === 'proximos7') {
      const days = getDaysUntilDue(transaction.data_vencimento || transaction.data_transacao);
      matchesPeriod = days >= 0 && days <= 7;
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesPessoa && matchesPeriod;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let compareA: any;
    let compareB: any;

    switch (sortColumn) {
      case 'id_sequencial':
        compareA = a.id_sequencial || 0;
        compareB = b.id_sequencial || 0;
        break;
      case 'descricao':
        compareA = a.descricao.toLowerCase();
        compareB = b.descricao.toLowerCase();
        break;
      case 'cliente':
        compareA = getPessoaName(a.id_pessoa).toLowerCase();
        compareB = getPessoaName(b.id_pessoa).toLowerCase();
        break;
      case 'categoria':
        compareA = getCategoryName(a.id_categoria).toLowerCase();
        compareB = getCategoryName(b.id_categoria).toLowerCase();
        break;
      case 'data_transacao':
        compareA = a.data_transacao;
        compareB = b.data_transacao;
        break;
      case 'data_vencimento':
        compareA = a.data_vencimento || a.data_transacao;
        compareB = b.data_vencimento || b.data_transacao;
        break;
      case 'valor':
        compareA = a.valor;
        compareB = b.valor;
        break;
      case 'status':
        compareA = a.status;
        compareB = b.status;
        break;
      default:
        return 0;
    }

    if (compareA < compareB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (compareA > compareB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totals = filteredTransactions.reduce((acc, transaction) => {
    acc.total += transaction.valor;
    if (transaction.status === 'pendente') {
      acc.pending += transaction.valor;
      if (isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status)) {
        acc.overdue += transaction.valor;
      }
    } else if (transaction.status === 'recebido') {
      acc.received += transaction.valor;
    }
    return acc;
  }, { total: 0, pending: 0, overdue: 0, received: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando contas a receber...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
            <p className="text-gray-600">Gerencie valores a receber de clientes</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Conta a Receber</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total a Receber</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendente</p>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCurrency(totals.pending)}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totals.overdue)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recebidas</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totals.received)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Calendar className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Filtro de Data */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Período de Análise:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Final</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    const monthRange = getCurrentMonthRange();
                    setFilters(prev => ({
                      ...prev,
                      startDate: monthRange.startDate,
                      endDate: monthRange.endDate
                    }));
                  }}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Mês Atual
                </button>
              </div>
            </div>
          </div>

          {/* Outros Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar contas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              >
                <option value="all">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="recebido">Recebido</option>
                <option value="vencido">Vencido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Categoria</label>
              <select
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              >
                <option value="all">Todas</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Cliente</label>
              <select
                value={filters.pessoa}
                onChange={(e) => setFilters({ ...filters, pessoa: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              >
                <option value="all">Todos</option>
                {pessoas.map(pessoa => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.nome_razao_social}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros de Período Rápido */}
          <div>
            <label className="block text-xs text-gray-600 mb-2">Filtros Rápidos:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters({ ...filters, periodo: 'hoje' })}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
              >
                Vence Hoje
              </button>
              <button
                onClick={() => setFilters({ ...filters, periodo: 'proximos7' })}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium hover:bg-yellow-200 transition-colors"
              >
                Próximos 7 dias
              </button>
              <button
                onClick={() => setFilters({ ...filters, periodo: 'vencidas' })}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
              >
                Vencidas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Receivable Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('id_sequencial')}
                >
                  <div className="flex items-center space-x-1">
                    <span>#</span>
                    {sortColumn === 'id_sequencial' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('descricao')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Descrição</span>
                    {sortColumn === 'descricao' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('cliente')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Cliente</span>
                    {sortColumn === 'cliente' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('categoria')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Categoria</span>
                    {sortColumn === 'categoria' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('data_transacao')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Data Transação</span>
                    {sortColumn === 'data_transacao' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('data_vencimento')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Vencimento</span>
                    {sortColumn === 'data_vencimento' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-right p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('valor')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Valor</span>
                    {sortColumn === 'valor' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  className="text-center p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Status</span>
                    {sortColumn === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="text-center p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium">
                      {transactions.length === 0 ? 'Nenhuma conta a receber encontrada' : 'Nenhuma conta corresponde aos filtros'}
                    </p>
                    <p className="text-sm">
                      {transactions.length === 0 
                        ? 'Clique em "Nova Conta a Receber" para começar' 
                        : 'Tente ajustar os filtros ou limpar a busca'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((transaction) => {
                  const daysUntilDue = getDaysUntilDue(transaction.data_vencimento || transaction.data_transacao);
                  const isTransactionOverdue = isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status);
                  
                  return (
                    <tr key={transaction.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                      isTransactionOverdue ? 'bg-red-50' : ''
                    }`}>
                      <td className="p-4 font-medium text-gray-900">
                        #{transaction.id_sequencial}
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{transaction.descricao}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.origem === 'whatsapp_ia' ? '🤖 WhatsApp IA' : 
                             transaction.origem === 'api' ? '🔗 API' : '✏️ Manual'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-900 dark:text-white truncate block max-w-32">
                          {transaction.nome_razao_social || getPessoaName(transaction.id_pessoa)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                          {getCategoryName(transaction.id_categoria)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-900">
                        {formatDate(transaction.data_transacao)}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className={`font-medium ${
                            isTransactionOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {formatDate(transaction.data_vencimento || transaction.data_transacao)}
                          </p>
                          {transaction.status === 'pendente' && (
                            <p className={`text-xs ${
                              isTransactionOverdue ? 'text-red-600' : 
                              daysUntilDue <= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {isTransactionOverdue 
                                ? `${Math.abs(daysUntilDue)} dias em atraso`
                                : daysUntilDue === 0 
                                  ? 'Vence hoje'
                                  : `${daysUntilDue} dias`
                              }
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-semibold text-green-600">
                        {formatCurrency(transaction.valor)}
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={transaction.status}
                          onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(transaction.status)}`}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="recebido">Recebido</option>
                          <option value="vencido">Vencido</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setViewingTransaction(transaction)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
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
                  );
                })
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
                {editingTransaction ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.descricao || ''}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Descrição da conta a receber"
                  />
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente
                  </label>
                  <select
                    value={formData.id_pessoa || ''}
                    onChange={(e) => setFormData({ ...formData, id_pessoa: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selecione um cliente</option>
                    {pessoas.map(pessoa => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome_razao_social}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Transação *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_transacao || ''}
                    onChange={(e) => setFormData({ ...formData, data_transacao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_vencimento || ''}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Observações adicionais sobre a conta a receber..."
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingTransaction ? 'Atualizar' : 'Criar'} Conta a Receber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Installment Modal */}
      {showDeleteModal && transactionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <AlertCircle size={24} className="text-red-600" />
                    <span>Excluir Parcela do Parcelamento</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Parcela {transactionToDelete.parcela_atual}/{transactionToDelete.numero_parcelas}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTransactionToDelete(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center space-x-2">
                  <Trash2 size={18} />
                  <span>Escopo da Exclusão</span>
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Escolha quais parcelas você deseja excluir. Esta ação não pode ser desfeita!
                </p>
                <div className="space-y-2">
                  <label className="flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-transparent hover:border-red-300 cursor-pointer transition-all">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="single"
                      checked={deleteScope === 'single'}
                      onChange={(e) => setDeleteScope(e.target.value as DeleteScope)}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Apenas esta parcela</div>
                      <div className="text-sm text-gray-600">
                        Exclui somente a parcela {transactionToDelete.parcela_atual}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-transparent hover:border-red-300 cursor-pointer transition-all">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="future"
                      checked={deleteScope === 'future'}
                      onChange={(e) => setDeleteScope(e.target.value as DeleteScope)}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Esta e todas as futuras</div>
                      <div className="text-sm text-gray-600">
                        Exclui {(transactionToDelete.numero_parcelas || 0) - (transactionToDelete.parcela_atual || 0) + 1} parcelas
                        (da {transactionToDelete.parcela_atual} até a {transactionToDelete.numero_parcelas})
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-3 bg-white rounded-lg border-2 border-transparent hover:border-red-300 cursor-pointer transition-all">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="all"
                      checked={deleteScope === 'all'}
                      onChange={(e) => setDeleteScope(e.target.value as DeleteScope)}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Todas as parcelas</div>
                      <div className="text-sm text-gray-600">
                        Exclui todas as {transactionToDelete.numero_parcelas} parcelas do parcelamento
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Atenção!</h4>
                    <p className="text-sm text-yellow-800">
                      Esta ação é permanente e não pode ser desfeita. Certifique-se de que deseja excluir {
                        deleteScope === 'single' ? 'esta parcela' :
                        deleteScope === 'future' ? 'estas parcelas e todas as futuras' :
                        'todas as parcelas deste parcelamento'
                      }.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTransactionToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteInstallmentsByScope}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Transaction Modal */}
      {viewingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalhes da Conta a Receber #{viewingTransaction.id_sequencial}
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
                  <label className="block text-sm font-medium text-gray-600">Valor</label>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(viewingTransaction.valor)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingTransaction.status)}`}>
                    {getStatusLabel(viewingTransaction.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data da Transação</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingTransaction.data_transacao)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data de Vencimento</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(viewingTransaction.data_vencimento || viewingTransaction.data_transacao)}
                  </p>
                  {viewingTransaction.status === 'pendente' && (
                    <p className={`text-sm ${
                      isOverdue(viewingTransaction.data_vencimento || viewingTransaction.data_transacao, viewingTransaction.status) 
                        ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {isOverdue(viewingTransaction.data_vencimento || viewingTransaction.data_transacao, viewingTransaction.status)
                        ? `${Math.abs(getDaysUntilDue(viewingTransaction.data_vencimento || viewingTransaction.data_transacao))} dias em atraso`
                        : `${getDaysUntilDue(viewingTransaction.data_vencimento || viewingTransaction.data_transacao)} dias restantes`
                      }
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Cliente</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingTransaction.nome_razao_social || getPessoaName(viewingTransaction.id_pessoa)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Categoria</label>
                  <p className="text-lg font-semibold text-gray-900">{getCategoryName(viewingTransaction.id_categoria)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Origem</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingTransaction.origem === 'whatsapp_ia' ? '🤖 WhatsApp IA' : 
                     viewingTransaction.origem === 'api' ? '🔗 API' : '✏️ Manual'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Descrição</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTransaction.descricao}</p>
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

              {/* Quick Actions */}
              {viewingTransaction.status === 'pendente' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        handleStatusChange(viewingTransaction.id, 'recebido');
                        setViewingTransaction(null);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Marcar como Recebido
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(viewingTransaction.id, 'vencido');
                        setViewingTransaction(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Marcar como Vencido
                    </button>
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

export default AccountsReceivable;