import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, Banknote, AlertTriangle, Calendar, Filter, Eye, CheckCircle, Repeat, X, CalendarDays } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type TransactionInsert = Database['public']['Tables']['transacoes']['Insert'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface AccountsReceivableProps {}

const AccountsReceivable: React.FC<AccountsReceivableProps> = () => {
  const { supabase, profile } = useAuth();
  
  // Calculate initial date filter for the entire current month
  const getInitialMonthDateRange = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0]
    };
  };
  
  const [dateFilter, setDateFilter] = useState(getInitialMonthDateRange());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [selectedType, setSelectedType] = useState<'normal' | 'recurring'>('normal');
  const [filters, setFilters] = useState({
    status: 'all',
    categoria: 'all',
    pessoa: 'all',
    periodo: 'all',
    vencimento: 'all'
  });

  
  // Filtro de data fixo para o mês atual
  const getMonthDateRange = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0]
    };
  };
  
  const [dateFilter] = useState(getMonthDateRange());
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
    e_recorrente: false,
    tipo_recorrencia: null,
    numero_parcelas: null,
    data_inicio_recorrencia: null,
    valor_parcela: null,
    ativa_recorrencia: true,
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile, dateFilter]);

  const loadData = async () => {
    try {
        setTransactions([]);
        setCategories([]);
      const [transactionsRes, categoriesRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'receita')
          .gte('data_transacao', dateFilter.startDate)
          .lte('data_transacao', dateFilter.endDate)
          .order('data_vencimento', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
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
        valor: Number(formData.valor || 0),
        tipo: 'receita' as const,
        id_categoria: formData.id_categoria || null,
        id_pessoa: formData.id_pessoa || null,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
      } else {
        if (formData.e_recorrente && formData.valor_parcela) {
          // Para receitas recorrentes, gerar os lançamentos apropriados
          await generateRecurringReceivables(transactionData);
        } else {
          // Para receitas normais, inserir apenas um lançamento
          const { error } = await supabase
            .from('transacoes')
            .insert(transactionData);

          if (error) throw error;
        }
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving account receivable:', error);
      alert('Erro ao salvar conta a receber. Tente novamente.');
    }
  };

  const generateRecurringReceivables = async (baseTransaction: any) => {
    try {
      const transactions = [];
      const startDate = new Date(formData.data_inicio_recorrencia || formData.data_transacao || '');
      const valorParcela = Number(formData.valor_parcela || 0);

      if (formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas) {
        // Gerar todas as parcelas
        for (let i = 0; i < formData.numero_parcelas; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          const dueDateString = dueDate.toISOString().split('T')[0];

          transactions.push({
            ...baseTransaction,
            valor: valorParcela,
            descricao: `${baseTransaction.descricao} (${i + 1}/${formData.numero_parcelas})`,
            data_vencimento: dueDateString,
            data_transacao: dueDateString,
            e_recorrente: true,
            tipo_recorrencia: 'parcelada',
            numero_parcelas: formData.numero_parcelas,
            parcela_atual: i + 1,
            data_inicio_recorrencia: formData.data_inicio_recorrencia,
            valor_parcela: valorParcela,
            ativa_recorrencia: true
          });
        }
      } else if (formData.tipo_recorrencia === 'assinatura') {
        // Gerar apenas o primeiro lançamento da assinatura
        const firstDueDate = formData.data_inicio_recorrencia;
        transactions.push({
          ...baseTransaction,
          valor: valorParcela,
          descricao: `${baseTransaction.descricao} - Assinatura Mensal`,
          data_vencimento: firstDueDate,
          data_transacao: firstDueDate,
          e_recorrente: true,
          tipo_recorrencia: 'assinatura',
          data_inicio_recorrencia: formData.data_inicio_recorrencia,
          valor_parcela: valorParcela,
          ativa_recorrencia: true
        });
      }

      if (transactions.length > 0) {
        const { error } = await supabase
          .from('transacoes')
          .insert(transactions);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error generating recurring transactions:', error);
      throw error;
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
      alert('Erro ao atualizar status.');
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
    if (!confirm('Tem certeza que deseja excluir esta conta a receber?')) return;

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
      alert('Erro ao excluir conta a receber.');
    }
  };

  const handleCancelRecurring = async (transactionId: string) => {
    if (!confirm('Deseja cancelar a recorrência desta receita? Lançamentos futuros pendentes serão removidos.')) return;

    try {
      // Desativar a recorrência
      const { error: updateError } = await supabase
        .from('transacoes')
        .update({ ativa_recorrencia: false })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Para receitas parceladas, cancelar parcelas futuras pendentes
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction?.tipo_recorrencia === 'parcelada' && transaction.id_transacao_pai) {
        const { error: cancelError } = await supabase
          .from('transacoes')
          .update({ status: 'cancelado' })
          .eq('id_transacao_pai', transaction.id_transacao_pai)
          .eq('status', 'pendente')
          .gt('data_vencimento', new Date().toISOString().split('T')[0]);

        if (cancelError) throw cancelError;
      }

      await loadData();
      alert('Recorrência cancelada com sucesso!');
    } catch (error) {
      console.error('Error canceling recurring transaction:', error);
      alert('Erro ao cancelar recorrência.');
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
      e_recorrente: false,
      tipo_recorrencia: null,
      numero_parcelas: null,
      data_inicio_recorrencia: null,
      valor_parcela: null,
      ativa_recorrencia: true,
    });
    setEditingTransaction(null);
    setShowForm(false);
    setShowTypeSelection(false);
    setSelectedType('normal');
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

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'recebido' || status === 'cancelado') return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(transaction.id_categoria).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getPessoaName(transaction.id_pessoa).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    const matchesCategory = filters.categoria === 'all' || transaction.id_categoria === filters.categoria;
    const matchesPessoa = filters.pessoa === 'all' || transaction.id_pessoa === filters.pessoa;

    // Filtro de vencimento
    let matchesVencimento = true;
    if (filters.vencimento === 'vencidas') {
      matchesVencimento = isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status);
    } else if (filters.vencimento === 'proximas') {
      const days = getDaysUntilDue(transaction.data_vencimento || transaction.data_transacao);
      matchesVencimento = days >= 0 && days <= 7 && transaction.status === 'pendente';
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesPessoa && matchesVencimento;
  });

  const totals = filteredTransactions.reduce((acc, transaction) => {
    if (transaction.status !== 'cancelado') {
      acc.total += transaction.valor;
      if (transaction.status === 'pendente') {
        acc.pendente += transaction.valor;
        if (isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status)) {
          acc.vencido += transaction.valor;
        }
      } else if (transaction.status === 'recebido') {
        acc.recebido += transaction.valor;
      }
    }
    return acc;
  }, { total: 0, pendente: 0, recebido: 0, vencido: 0 });

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
          <Banknote className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
            <p className="text-gray-600">Gerencie suas receitas e recebimentos</p>
          </div>
        </div>
        <button
          onClick={() => setShowTypeSelection(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Banknote className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totals.pendente)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Calendar className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.recebido)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencido</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.vencido)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-center space-x-3">
          <Calendar size={20} className="text-blue-600" />
          <div className="text-center">
            <span className="font-bold text-gray-900 text-lg">Período Fixo: Mês Atual</span>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(dateFilter.startDate).toLocaleDateString('pt-BR')} até {new Date(dateFilter.endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <CalendarDays className="h-5 w-6 text-green-600" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filtro de Período</h3>
              <p className="text-xs sm:text-sm text-gray-600">Selecione o período para análise</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <label className="text-sm font-medium text-gray-700">De:</label>
            <input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-auto"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <label className="text-sm font-medium text-gray-700">Até:</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-auto"
            />
          </div>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateFilter({
                startDate: firstDay.toISOString().split('T')[0],
                endDate: today.toISOString().split('T')[0]
              });
            }}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm w-full sm:w-auto whitespace-nowrap"
          >
            Mês Atual
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar contas a receber..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="recebido">Recebido</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={filters.vencimento}
            onChange={(e) => setFilters({ ...filters, vencimento: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Todos os vencimentos</option>
            <option value="vencidas">Vencidas</option>
            <option value="proximas">Próximas (7 dias)</option>
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Todas as pessoas</option>
            {pessoas.map(pessoa => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome_razao_social}
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
                <th className="text-left p-4 font-medium text-gray-600">Descrição</th>
                <th className="text-left p-4 font-medium text-gray-600">Pessoa</th>
                <th className="text-left p-4 font-medium text-gray-600">Categoria</th>
                <th className="text-left p-4 font-medium text-gray-600">Vencimento</th>
                <th className="text-right p-4 font-medium text-gray-600">Valor</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-center p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <Banknote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Nenhuma conta a receber encontrada</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const overdue = isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status);
                  const daysUntilDue = getDaysUntilDue(transaction.data_vencimento || transaction.data_transacao);
                  
                  return (
                    <tr 
                      key={transaction.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        overdue ? 'bg-red-50' : daysUntilDue <= 7 && transaction.status === 'pendente' ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.descricao}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-sm text-gray-500">ID: {transaction.id_sequencial}</p>
                            {transaction.e_recorrente && (
                              <div className="flex items-center space-x-1">
                                <Repeat size={12} className="text-purple-600" />
                                <span className="text-xs text-purple-600 font-medium">
                                  {transaction.tipo_recorrencia === 'parcelada' && transaction.parcela_atual && transaction.numero_parcelas
                                    ? `${transaction.parcela_atual}/${transaction.numero_parcelas}`
                                    : 'Recorrente'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          {overdue && (
                            <p className="text-xs text-red-600 font-medium">
                              Vencido há {Math.abs(daysUntilDue)} dias
                            </p>
                          )}
                          {!overdue && daysUntilDue <= 7 && transaction.status === 'pendente' && (
                            <p className="text-xs text-yellow-600 font-medium">
                              Vence em {daysUntilDue} dias
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-900">
                        {getPessoaName(transaction.id_pessoa)}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {getCategoryName(transaction.id_categoria)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-900">
                        {formatDate(transaction.data_vencimento || transaction.data_transacao)}
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
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setViewingTransaction(transaction)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          {transaction.e_recorrente && transaction.ativa_recorrencia && (
                            <button
                              onClick={() => handleCancelRecurring(transaction.id)}
                              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Cancelar Recorrência"
                            >
                              <X size={16} />
                            </button>
                          )}
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
              {selectedType === 'recurring' && !editingTransaction && (
                <p className="text-sm text-gray-600 mt-1">
                  Configure os parâmetros da recorrência para gerar os lançamentos automaticamente
                </p>
              )}
              {selectedType === 'recurring' && formData.tipo_recorrencia && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">📋 Resumo da Recorrência</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    {formData.tipo_recorrencia === 'parcelada' ? (
                      <>
                        <p>• <strong>Tipo:</strong> Parcelamento em {formData.numero_parcelas} vezes</p>
                        <p>• <strong>Valor por parcela:</strong> {formatCurrency(formData.valor_parcela || 0)}</p>
                        <p>• <strong>Valor total:</strong> {formatCurrency((formData.valor_parcela || 0) * (formData.numero_parcelas || 1))}</p>
                        <p>• <strong>Primeira parcela:</strong> {formData.data_inicio_recorrencia ? formatDate(formData.data_inicio_recorrencia) : '-'}</p>
                        <p>• <strong>Última parcela:</strong> {formData.data_inicio_recorrencia && formData.numero_parcelas ? 
                          formatDate(new Date(new Date(formData.data_inicio_recorrencia).setMonth(new Date(formData.data_inicio_recorrencia).getMonth() + formData.numero_parcelas - 1)).toISOString().split('T')[0]) : '-'}</p>
                      </>
                    ) : (
                      <>
                        <p>• <strong>Tipo:</strong> Assinatura mensal</p>
                        <p>• <strong>Valor mensal:</strong> {formatCurrency(formData.valor_parcela || 0)}</p>
                        <p>• <strong>Início:</strong> {formData.data_inicio_recorrencia ? formatDate(formData.data_inicio_recorrencia) : '-'}</p>
                        <p>• <strong>Frequência:</strong> Todo dia {formData.data_inicio_recorrencia ? new Date(formData.data_inicio_recorrencia).getDate() : '-'} do mês</p>
                      </>
                    )}
                  </div>
                </div>
              )}
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
                    required={selectedType === 'normal'}
                    disabled={selectedType === 'recurring'}
                    value={formData.valor || ''}
                    onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      selectedType === 'recurring' ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                    placeholder={selectedType === 'recurring' ? 'Valor será definido pela recorrência' : 'Valor da receita'}
                  />
                  {selectedType === 'recurring' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Para receitas recorrentes, use o campo "Valor da Parcela/Assinatura" abaixo
                    </p>
                  )}
                </div>

                {/* Campos específicos para transações recorrentes */}
                {selectedType === 'recurring' && !editingTransaction && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Recorrência *
                      </label>
                      <select
                        required
                        value={formData.tipo_recorrencia || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          tipo_recorrencia: e.target.value as 'parcelada' | 'assinatura',
                          // Reset campos relacionados quando mudar tipo
                          numero_parcelas: e.target.value === 'parcelada' ? 2 : null
                        })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="parcelada">Parcelada (número fixo de parcelas)</option>
                        <option value="assinatura">Assinatura (recorrência contínua)</option>
                      </select>
                    </div>

                    {formData.tipo_recorrencia === 'parcelada' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número de Parcelas *
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="60"
                          required
                          value={formData.numero_parcelas || ''}
                          onChange={(e) => setFormData({ ...formData, numero_parcelas: Number(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Ex: 12"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Quantas parcelas serão geradas (mínimo 2, máximo 60)
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data de Início da Recorrência *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data_inicio_recorrencia || ''}
                        onChange={(e) => setFormData({ ...formData, data_inicio_recorrencia: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.tipo_recorrencia === 'parcelada' 
                          ? 'Data de vencimento da primeira parcela'
                          : 'Data de vencimento da primeira cobrança da assinatura'
                        }
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valor da {formData.tipo_recorrencia === 'parcelada' ? 'Parcela' : 'Assinatura'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.valor_parcela || ''}
                        onChange={(e) => {
                          const valorParcela = Number(e.target.value);
                          setFormData({ 
                            ...formData, 
                            valor_parcela: valorParcela,
                            // Para parceladas, calcular valor total automaticamente
                            valor: formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas 
                              ? valorParcela * formData.numero_parcelas 
                              : valorParcela
                          });
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Valor de cada parcela ou mensalidade"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.tipo_recorrencia === 'parcelada' 
                          ? `Valor de cada parcela. Total: ${formatCurrency((formData.valor_parcela || 0) * (formData.numero_parcelas || 1))}`
                          : 'Valor que será cobrado mensalmente'
                        }
                      </p>
                    </div>
                  </>
                )}

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
                    Pessoa
                  </label>
                  <select
                    value={formData.id_pessoa || ''}
                    onChange={(e) => setFormData({ ...formData, id_pessoa: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma pessoa</option>
                    {pessoas.map(pessoa => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome_razao_social}
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
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
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
                  disabled={selectedType === 'recurring' && (!formData.tipo_recorrencia || !formData.valor_parcela || !formData.data_inicio_recorrencia)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingTransaction ? 'Atualizar' : 'Criar'} Conta a Receber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Type Selection Modal */}
      {showTypeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Escolha o Tipo de Receita
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecione como você deseja registrar esta conta a receber
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Receita Normal */}
                <button
                  onClick={() => {
                    setSelectedType('normal');
                    setFormData(prev => ({
                      ...prev,
                      e_recorrente: false,
                      tipo_recorrencia: null,
                      numero_parcelas: null,
                      data_inicio_recorrencia: null,
                      valor_parcela: null
                    }));
                    setShowTypeSelection(false);
                    setShowForm(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                      <Banknote className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Receita Normal</h3>
                      <p className="text-sm text-gray-600">Recebimento único ou eventual</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Valor único definido</p>
                    <p>• Data de vencimento específica</p>
                    <p>• Ideal para: vendas à vista, serviços pontuais</p>
                  </div>
                </button>

                {/* Receita Recorrente */}
                <button
                  onClick={() => {
                    setSelectedType('recurring');
                    setFormData(prev => ({
                      ...prev,
                      e_recorrente: true,
                      tipo_recorrencia: 'parcelada',
                      numero_parcelas: 2,
                      data_inicio_recorrencia: new Date().toISOString().split('T')[0],
                      valor_parcela: 0,
                      valor: 0 // Zerar o valor principal
                    }));
                    setShowTypeSelection(false);
                    setShowForm(true);
                  }}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                      <Repeat className="text-purple-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Receita Recorrente</h3>
                      <p className="text-sm text-gray-600">Parcelamento ou assinatura</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Gera lançamentos automáticos</p>
                    <p>• Controle de parcelas ou assinaturas</p>
                    <p>• Ideal para: serviços parcelados, mensalidades</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowTypeSelection(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
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
                  Detalhes da Conta a Receber
                </h2>
                <button
                  onClick={() => setViewingTransaction(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
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
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(viewingTransaction.valor)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data da Transação</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingTransaction.data_transacao)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data de Vencimento</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingTransaction.data_vencimento || viewingTransaction.data_transacao)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingTransaction.status)}`}>
                    {getStatusLabel(viewingTransaction.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Pessoa</label>
                  <p className="text-lg font-semibold text-gray-900">{getPessoaName(viewingTransaction.id_pessoa)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Categoria</label>
                  <p className="text-lg font-semibold text-gray-900">{getCategoryName(viewingTransaction.id_categoria)}</p>
                </div>
              </div>

              {viewingTransaction.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTransaction.observacoes}</p>
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