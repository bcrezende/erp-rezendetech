import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, CreditCard, AlertTriangle, Calendar, Filter, Eye, CheckCircle, Repeat, X, CalendarDays } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type TransactionInsert = Database['public']['Tables']['transacoes']['Insert'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface AccountsPayableProps {}

const AccountsPayable: React.FC<AccountsPayableProps> = () => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    categoria: 'all',
    pessoa: 'all',
    periodo: 'all',
    vencimento: 'all'
  });

  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [formData, setFormData] = useState<Partial<TransactionInsert>>({
    valor: 0,
    tipo: 'despesa',
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
      const [transactionsRes, categoriesRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('tipo', 'despesa')
          .gte('data_transacao', dateFilter.startDate)
          .lte('data_transacao', dateFilter.endDate)
          .order('data_vencimento', { ascending: true }),
        supabase
          .from('categorias')
          .select('*')
          .eq('tipo', 'despesa')
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('pessoas')
          .select('*')
          .eq('tipo_cadastro', 'fornecedor')
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
      console.error('Error loading accounts payable data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelection = (type: 'normal' | 'recurring') => {
    setIsRecurring(type === 'recurring');
    setShowTypeSelection(false);
    setShowForm(true);
    
    // Reset form data based on type
    if (type === 'recurring') {
      setFormData(prev => ({
        ...prev,
        valor: 0, // Zero out main value for recurring
        e_recorrente: true,
        tipo_recorrencia: 'parcelada',
        numero_parcelas: 2,
        data_inicio_recorrencia: new Date().toISOString().split('T')[0],
        valor_parcela: 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        valor: 0,
        e_recorrente: false,
        tipo_recorrencia: null,
        numero_parcelas: null,
        data_inicio_recorrencia: null,
        valor_parcela: null
      }));
    }
  };

  const generateRecurringTransactions = async (baseTransaction: any) => {
    try {
      const transactions = [];
      const startDate = new Date(formData.data_inicio_recorrencia || formData.data_transacao || '');

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      if (formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas) {
        // Gerar todas as parcelas
        for (let i = 0; i < formData.numero_parcelas; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          const dueDateString = dueDate.toISOString().split('T')[0];
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Apenas a parcela do mês atual (ou anterior) fica com o status definido pelo usuário
          // Parcelas futuras ficam sempre como 'pendente'
          const parcelaStatus = dueDateStr <= todayStr ? baseTransaction.status : 'pendente';
          
          // Primeira parcela (mês atual) fica com status definido pelo usuário
          // Parcelas futuras ficam pendentes
          const isCurrentMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
          const currentParcelaStatus = isCurrentMonth ? baseTransaction.status : 'pendente';

          transactions.push({
            ...baseTransaction,
            status: parcelaStatus,
            descricao: `${baseTransaction.descricao} (${i + 1}/${formData.numero_parcelas})`,
            data_vencimento: dueDateString,
            data_transacao: dueDateString,
            status: currentParcelaStatus,
            e_recorrente: true,
            tipo_recorrencia: 'parcelada',
            numero_parcelas: formData.numero_parcelas,
            parcela_atual: i + 1,
            data_inicio_recorrencia: formData.data_inicio_recorrencia,
            valor_parcela: formData.valor_parcela,
            ativa_recorrencia: true
          });
        }
      } else if (formData.tipo_recorrencia === 'assinatura') {
        const isCurrentMonth = startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
        const assinaturaStatus = isCurrentMonth ? baseTransaction.status : 'pendente';
        
        // Gerar apenas o primeiro lançamento da assinatura
        const firstDueDate = formData.data_inicio_recorrencia;
        transactions.push({
          ...baseTransaction,
          descricao: `${baseTransaction.descricao} - Assinatura Mensal`,
          data_vencimento: firstDueDate,
          data_transacao: firstDueDate,
          status: assinaturaStatus,
          e_recorrente: true,
          tipo_recorrencia: 'assinatura',
          data_inicio_recorrencia: formData.data_inicio_recorrencia,
          valor_parcela: formData.valor_parcela,
          ativa_recorrencia: true
        });
      }

      if (transactions.length > 0) {
        console.log('📝 Creating recurring transactions:', {
          total: transactions.length,
          statusDistribution: transactions.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });
        
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa) return;

    try {
      // Para despesas recorrentes, usar valor_parcela; para normais, usar valor
      const valorFinal = formData.e_recorrente ? Number(formData.valor_parcela || 0) : Number(formData.valor || 0);

      const transactionData = {
        ...formData,
        id_empresa: profile.id_empresa,
        valor: valorFinal,
        tipo: 'despesa' as const,
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
        if (formData.e_recorrente) {
          // Para despesas recorrentes, usar função específica
          await generateRecurringTransactions(transactionData);
        } else {
          // Para despesas normais, inserir apenas um lançamento
          const { error } = await supabase
            .from('transacoes')
            .insert(transactionData);

          if (error) throw error;
        }
      }

      await loadData();
      resetForm();
      alert(editingTransaction ? 'Conta a pagar atualizada com sucesso!' : 'Conta a pagar criada com sucesso!');
    } catch (error) {
      console.error('Error saving account payable:', error);
      alert('Erro ao salvar conta a pagar. Tente novamente.');
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
    setIsRecurring(transaction.e_recorrente || false);
    setFormData({
      valor: transaction.e_recorrente ? 0 : transaction.valor,
      tipo: 'despesa',
      descricao: transaction.descricao,
      data_transacao: transaction.data_transacao,
      data_vencimento: transaction.data_vencimento || transaction.data_transacao,
      id_categoria: transaction.id_categoria || '',
      id_pessoa: transaction.id_pessoa || '',
      status: transaction.status,
      origem: transaction.origem,
      observacoes: transaction.observacoes,
      e_recorrente: transaction.e_recorrente,
      tipo_recorrencia: transaction.tipo_recorrencia,
      numero_parcelas: transaction.numero_parcelas,
      data_inicio_recorrencia: transaction.data_inicio_recorrencia,
      valor_parcela: transaction.valor_parcela,
      ativa_recorrencia: transaction.ativa_recorrencia,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a pagar?')) return;

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
      alert('Conta a pagar excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting account payable:', error);
      alert('Erro ao excluir conta a pagar.');
    }
  };

  const handleCancelRecurring = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta despesa recorrente? Todos os lançamentos futuros pendentes serão removidos.')) return;

    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      if (transaction.tipo_recorrencia === 'assinatura') {
        // Para assinaturas, desativar a recorrência
        const { error } = await supabase
          .from('transacoes')
          .update({ ativa_recorrencia: false })
          .eq('id', transactionId);

        if (error) throw error;
      } else if (transaction.tipo_recorrencia === 'parcelada') {
        // Para parceladas, cancelar todas as parcelas futuras pendentes
        const { error } = await supabase
          .from('transacoes')
          .update({ status: 'cancelado' })
          .eq('id_transacao_pai', transactionId)
          .eq('status', 'pendente');

        if (error) throw error;

        // Também cancelar a transação principal se ainda estiver pendente
        if (transaction.status === 'pendente') {
          const { error: mainError } = await supabase
            .from('transacoes')
            .update({ status: 'cancelado', ativa_recorrencia: false })
            .eq('id', transactionId);

          if (mainError) throw mainError;
        }
      }

      await loadData();
      alert('Despesa recorrente cancelada com sucesso!');
    } catch (error) {
      console.error('Error canceling recurring expense:', error);
      alert('Erro ao cancelar despesa recorrente.');
    }
  };

  const resetForm = () => {
    setFormData({
      valor: 0,
      tipo: 'despesa',
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
    setIsRecurring(false);
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
    if (status === 'pago' || status === 'cancelado') return false;
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
      pago: 'bg-green-100 text-green-700',
      vencido: 'bg-red-100 text-red-700',
      cancelado: 'bg-gray-100 text-gray-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendente: 'Pendente',
      pago: 'Pago',
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
      } else if (transaction.status === 'pago') {
        acc.pago += transaction.valor;
      }
    }
    return acc;
  }, { total: 0, pendente: 0, pago: 0, vencido: 0 });

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
          <CreditCard className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
            <p className="text-gray-600">Gerencie suas despesas e pagamentos</p>
          </div>
        </div>
        <button
          onClick={() => setShowTypeSelection(true)}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Conta a Pagar</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <CreditCard className="text-gray-600" size={24} />
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
            <Calendar className="text-yellow-600" size={24} />
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
            <AlertTriangle className="text-red-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pago</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.pago)}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <CalendarDays className="h-5 w-6 text-blue-600" />
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent w-full sm:w-auto"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <label className="text-sm font-medium text-gray-700">Até:</label>
            <input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent w-full sm:w-auto"
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
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm w-full sm:w-auto whitespace-nowrap"
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
              placeholder="Buscar contas a pagar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <select
            value={filters.vencimento}
            onChange={(e) => setFilters({ ...filters, vencimento: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">Todos os vencimentos</option>
            <option value="vencidas">Vencidas</option>
            <option value="proximas">Próximas (7 dias)</option>
          </select>

          <select
            value={filters.categoria}
            onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">Todas as pessoas</option>
            {pessoas.filter(p => ['fornecedor', 'colaborador', 'outro'].includes(p.tipo_cadastro)).map(pessoa => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome_razao_social} ({pessoa.tipo_cadastro})
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
                <th className="text-left p-4 font-medium text-gray-600">Fornecedor</th>
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
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Nenhuma conta a pagar encontrada</p>
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
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{transaction.descricao}</p>
                            {transaction.e_recorrente && (
                              <div className="flex items-center space-x-1">
                                <Repeat size={14} className="text-blue-600" />
                                <span className="text-xs text-blue-600 font-medium">
                                  {transaction.tipo_recorrencia === 'parcelada' ? 'Parcelada' : 'Assinatura'}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">ID: {transaction.id_sequencial}</p>
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
                      <td className="p-4 text-right font-semibold text-red-600">
                        {formatCurrency(transaction.valor)}
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={transaction.status}
                          onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(transaction.status)}`}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
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
                              title="Cancelar Despesa Recorrente"
                            >
                              <AlertTriangle size={16} />
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

      {/* Type Selection Modal */}
      {showTypeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Escolha o Tipo de Despesa
                </h2>
                <button
                  onClick={() => setShowTypeSelection(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Despesa Normal */}
                <button
                  onClick={() => handleTypeSelection('normal')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="text-center">
                    <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <CreditCard className="text-blue-600 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Despesa Normal
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Para pagamentos únicos ou eventuais
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Pagamento único</p>
                      <p>• Valor fixo</p>
                      <p>• Sem repetição</p>
                    </div>
                  </div>
                </button>

                {/* Despesa Recorrente */}
                <button
                  onClick={() => handleTypeSelection('recurring')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <div className="text-center">
                    <div className="p-4 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                      <Repeat className="text-orange-600 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Despesa Recorrente
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Para parcelamentos ou assinaturas
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Compras parceladas</p>
                      <p>• Assinaturas mensais</p>
                      <p>• Geração automática</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">💡 Dica</h4>
                <p className="text-sm text-gray-600">
                  Escolha "Despesa Recorrente" para automatizar lançamentos futuros como Netflix, energia elétrica, 
                  ou compras parceladas. O sistema gerará automaticamente os próximos vencimentos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTransaction ? 'Editar Conta a Pagar' : 
                   isRecurring ? 'Nova Despesa Recorrente' : 'Nova Conta a Pagar'}
                </h2>
                <div className="flex items-center space-x-2">
                  {isRecurring && (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                      Recorrente
                    </span>
                  )}
                </div>
              </div>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={isRecurring ? "Ex: Netflix, Energia Elétrica, Compra Parcelada..." : "Descrição da despesa"}
                  />
                </div>

                {/* Campo Valor - Desabilitado para recorrentes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor {!isRecurring && '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={!isRecurring}
                    disabled={isRecurring}
                    value={isRecurring ? '' : (formData.valor || '')}
                    onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      isRecurring ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                    placeholder={isRecurring ? 'Valor será definido pela recorrência' : 'Valor da despesa'}
                  />
                  {isRecurring && (
                    <p className="text-xs text-gray-500 mt-1">
                      Para despesas recorrentes, use o campo "Valor da Parcela/Assinatura" abaixo
                    </p>
                  )}
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.id_categoria || ''}
                    onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.nome}
                        {category.classificacao_dre && 
                          ` (${category.classificacao_dre.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())})`
                        }
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornecedor
                  </label>
                  <select
                    value={formData.id_pessoa || ''}
                    onChange={(e) => setFormData({ ...formData, id_pessoa: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Selecione um fornecedor</option>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Campos de Recorrência - Apenas para despesas recorrentes */}
                {isRecurring && (
                  <>
                    <div className="md:col-span-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-3 flex items-center space-x-2">
                        <Repeat size={18} />
                        <span>Configurações de Recorrência</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            Tipo de Recorrência *
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="tipo_recorrencia"
                                value="parcelada"
                                checked={formData.tipo_recorrencia === 'parcelada'}
                                onChange={(e) => setFormData({ ...formData, tipo_recorrencia: e.target.value as any })}
                                className="text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-900">Compra Parcelada</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="tipo_recorrencia"
                                value="assinatura"
                                checked={formData.tipo_recorrencia === 'assinatura'}
                                onChange={(e) => setFormData({ ...formData, tipo_recorrencia: e.target.value as any })}
                                className="text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-900">Assinatura Mensal</span>
                            </label>
                          </div>
                        </div>

                        {formData.tipo_recorrencia === 'parcelada' && (
                          <div>
                            <label className="block text-sm font-medium text-orange-800 mb-2">
                              Número de Parcelas *
                            </label>
                            <input
                              type="number"
                              min="2"
                              required
                              value={formData.numero_parcelas || ''}
                              onChange={(e) => setFormData({ ...formData, numero_parcelas: Number(e.target.value) })}
                              className="w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="Ex: 12"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            Data de Início da Recorrência *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.data_inicio_recorrencia || ''}
                            onChange={(e) => setFormData({ ...formData, data_inicio_recorrencia: e.target.value })}
                            className="w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            Valor da {formData.tipo_recorrencia === 'parcelada' ? 'Parcela' : 'Assinatura'} *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formData.valor_parcela || ''}
                            onChange={(e) => setFormData({ ...formData, valor_parcela: Number(e.target.value) })}
                            className="w-full border border-orange-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Valor de cada parcela/mensalidade"
                          />
                        </div>
                      </div>

                      {/* Resumo da Recorrência */}
                      {formData.valor_parcela && formData.valor_parcela > 0 && (
                        <div className="mt-4 p-3 bg-white border border-orange-200 rounded-lg">
                          <h5 className="font-medium text-orange-900 mb-2">📋 Resumo da Recorrência</h5>
                          <div className="text-sm text-orange-800 space-y-1">
                            {formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas && (
                              <>
                                <p><strong>Total:</strong> {formatCurrency((formData.valor_parcela || 0) * (formData.numero_parcelas || 0))}</p>
                                <p><strong>Parcelas:</strong> {formData.numero_parcelas}x de {formatCurrency(formData.valor_parcela || 0)}</p>
                                <p><strong>Período:</strong> {formData.numero_parcelas} meses</p>
                              </>
                            )}
                            {formData.tipo_recorrencia === 'assinatura' && (
                              <>
                                <p><strong>Valor Mensal:</strong> {formatCurrency(formData.valor_parcela || 0)}</p>
                                <p><strong>Tipo:</strong> Assinatura contínua</p>
                                <p><strong>Próxima cobrança:</strong> Todo dia {new Date(formData.data_inicio_recorrencia || '').getDate()}</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre a despesa..."
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {editingTransaction ? 'Atualizar' : 'Criar'} Conta a Pagar
                </button>
              </div>
            </form>
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
                  Detalhes da Conta a Pagar
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
                  <label className="block text-sm font-medium text-gray-600">Fornecedor</label>
                  <p className="text-lg font-semibold text-gray-900">{getPessoaName(viewingTransaction.id_pessoa)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Categoria</label>
                  <p className="text-lg font-semibold text-gray-900">{getCategoryName(viewingTransaction.id_categoria)}</p>
                </div>
              </div>

              {/* Informações de Recorrência */}
              {viewingTransaction.e_recorrente && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center space-x-2">
                    <Repeat size={16} />
                    <span>Informações de Recorrência</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-orange-800 font-medium">Tipo:</span>
                      <p className="text-orange-700">
                        {viewingTransaction.tipo_recorrencia === 'parcelada' ? 'Compra Parcelada' : 'Assinatura Mensal'}
                      </p>
                    </div>
                    {viewingTransaction.numero_parcelas && (
                      <div>
                        <span className="text-orange-800 font-medium">Parcelas:</span>
                        <p className="text-orange-700">
                          {viewingTransaction.parcela_atual || 1}/{viewingTransaction.numero_parcelas}
                        </p>
                      </div>
                    )}
                    {viewingTransaction.valor_parcela && (
                      <div>
                        <span className="text-orange-800 font-medium">Valor da Parcela:</span>
                        <p className="text-orange-700">{formatCurrency(viewingTransaction.valor_parcela)}</p>
                      </div>
                    )}
                    {viewingTransaction.data_inicio_recorrencia && (
                      <div>
                        <span className="text-orange-800 font-medium">Início:</span>
                        <p className="text-orange-700">{formatDate(viewingTransaction.data_inicio_recorrencia)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-orange-800 font-medium">Status da Recorrência:</span>
                      <p className="text-orange-700">
                        {viewingTransaction.ativa_recorrencia ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

export default AccountsPayable;