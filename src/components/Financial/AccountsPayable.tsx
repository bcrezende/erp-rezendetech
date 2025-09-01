import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, CreditCard, Calendar, DollarSign, Clock, CheckCircle, AlertCircle, Eye, X } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type TransactionInsert = Database['public']['Tables']['transacoes']['Insert'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

const AccountsPayable: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    categoria: 'all',
    pessoa: 'all',
    periodo: 'current-month'
  });

  // Calcular período do mês atual (01 ao último dia)
  const getCurrentMonthPeriod = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  };

  const [dateFilter, setDateFilter] = useState(getCurrentMonthPeriod());

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
    data_inicio_recorrencia: null,
    valor_parcela: null,
    ativa_recorrencia: true,
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
          .eq('tipo', 'despesa')
          .gte('data_vencimento', dateFilter.startDate)
          .lte('data_vencimento', dateFilter.endDate)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa) return;

    try {
      if (editingTransaction) {
        // Para edição, apenas atualizar a transação existente (sem criar novas parcelas)
        const transactionData = {
          ...formData,
          id_empresa: profile.id_empresa,
          valor: formData.e_recorrente ? Number(formData.valor_parcela) : Number(formData.valor),
          tipo: 'despesa' as const,
          id_categoria: formData.id_categoria || null,
          id_pessoa: formData.id_pessoa || null,
        };

        const { error } = await supabase
          .from('transacoes')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;
        alert('Conta a pagar atualizada com sucesso!');
      } else {
        // Para criação nova
        if (formData.e_recorrente && formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas && formData.numero_parcelas > 1) {
          // Criar despesa parcelada - múltiplas transações
          await createParceladaTransactions();
        } else {
          // Criar despesa única ou assinatura (apenas primeira parcela)
          const transactionData = {
            ...formData,
            id_empresa: profile.id_empresa,
            valor: formData.e_recorrente ? Number(formData.valor_parcela) : Number(formData.valor),
            tipo: 'despesa' as const,
            id_categoria: formData.id_categoria || null,
            id_pessoa: formData.id_pessoa || null,
            parcela_atual: formData.e_recorrente ? 1 : null,
            descricao: formData.e_recorrente && formData.tipo_recorrencia === 'assinatura' 
              ? `${formData.descricao} (Assinatura)`
              : formData.descricao
          };

          const { error } = await supabase
            .from('transacoes')
            .insert(transactionData);

          if (error) throw error;
          alert(formData.e_recorrente ? 'Assinatura criada com sucesso!' : 'Conta a pagar criada com sucesso!');
        }
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar conta a pagar. Tente novamente.');
    }
  };

  const createParceladaTransactions = async () => {
    if (!profile?.id_empresa || !formData.numero_parcelas || !formData.data_inicio_recorrencia) return;

    try {
      // 1. Criar a transação pai (primeira parcela)
      const transacaoPaiData = {
        ...formData,
        id_empresa: profile.id_empresa,
        valor: Number(formData.valor_parcela),
        tipo: 'despesa' as const,
        id_categoria: formData.id_categoria || null,
        id_pessoa: formData.id_pessoa || null,
        data_transacao: formData.data_inicio_recorrencia,
        data_vencimento: formData.data_inicio_recorrencia,
        parcela_atual: 1,
        id_transacao_pai: null,
        descricao: `${formData.descricao} (Parcela 1/${formData.numero_parcelas})`
      };

      const { data: transacaoPai, error: paiError } = await supabase
        .from('transacoes')
        .insert(transacaoPaiData)
        .select()
        .single();

      if (paiError) throw paiError;

      console.log('✅ Transação pai criada:', transacaoPai.id);

      // 2. Criar as parcelas futuras (2ª até a última)
      const parcelasFuturas = [];
      
      for (let i = 2; i <= formData.numero_parcelas; i++) {
        const dataVencimento = new Date(formData.data_inicio_recorrencia);
        dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
        
        const parcelaData = {
          id_empresa: profile.id_empresa,
          valor: Number(formData.valor_parcela),
          tipo: 'despesa' as const,
          descricao: `${formData.descricao} (Parcela ${i}/${formData.numero_parcelas})`,
          data_transacao: dataVencimento.toISOString().split('T')[0],
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          id_categoria: formData.id_categoria || null,
          id_pessoa: formData.id_pessoa || null,
          status: 'pendente',
          origem: 'manual',
          observacoes: formData.observacoes,
          e_recorrente: true,
          tipo_recorrencia: 'parcelada',
          numero_parcelas: formData.numero_parcelas,
          parcela_atual: i,
          data_inicio_recorrencia: formData.data_inicio_recorrencia,
          valor_parcela: Number(formData.valor_parcela),
          id_transacao_pai: transacaoPai.id,
          ativa_recorrencia: true
        };
        
        parcelasFuturas.push(parcelaData);
      }

      // Inserir todas as parcelas futuras em lote
      if (parcelasFuturas.length > 0) {
        const { error: parcelasError } = await supabase
          .from('transacoes')
          .insert(parcelasFuturas);

        if (parcelasError) throw parcelasError;

        console.log('✅ Parcelas futuras criadas:', parcelasFuturas.length);
      }

      alert(`Despesa parcelada criada com sucesso! ${formData.numero_parcelas} parcelas de ${formatCurrency(Number(formData.valor_parcela))} foram geradas.`);

    } catch (error) {
      console.error('Error creating parcelada transactions:', error);
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
      alert('Erro ao atualizar status da conta.');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      valor: transaction.valor,
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
    if (!confirm('Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
      alert('Conta a pagar excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir conta a pagar. Tente novamente.');
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

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'pendente') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategoryName(transaction.id_categoria).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getPessoaName(transaction.id_pessoa).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id_sequencial?.toString().includes(searchTerm);
    
    const matchesStatus = filters.status === 'all' || transaction.status === filters.status;
    const matchesCategory = filters.categoria === 'all' || transaction.id_categoria === filters.categoria;
    const matchesPessoa = filters.pessoa === 'all' || transaction.id_pessoa === filters.pessoa;

    return matchesSearch && matchesStatus && matchesCategory && matchesPessoa;
  });

  const totals = filteredTransactions.reduce((acc, transaction) => {
    acc.total += transaction.valor;
    if (transaction.status === 'pendente') {
      acc.pendente += transaction.valor;
      if (isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status)) {
        acc.vencido += transaction.valor;
      }
    } else if (transaction.status === 'pago') {
      acc.pago += transaction.valor;
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
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Período de Análise</h3>
              <p className="text-sm text-gray-600">Mês atual completo</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">De:</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Até:</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setDateFilter(getCurrentMonthPeriod())}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap"
            >
              Mês Atual
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Geral</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <DollarSign className="text-gray-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCurrency(totals.pendente)}
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
              <p className="text-sm font-medium text-gray-600">Pagas</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totals.pago)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(totals.vencido)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertCircle className="text-red-600" size={24} />
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
            <option value="all">Todos os fornecedores</option>
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
                <th className="text-left p-4 font-medium text-gray-600">#</th>
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
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Nenhuma conta a pagar encontrada</p>
                    <p className="text-sm">Clique em "Nova Conta" para começar</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status) 
                        ? 'bg-red-50' 
                        : ''
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
                    <td className="p-4 text-gray-900">
                      {transaction.nome_razao_social || getPessoaName(transaction.id_pessoa)}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {getCategoryName(transaction.id_categoria)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className={`font-medium ${
                          isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status)
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {formatDate(transaction.data_vencimento || transaction.data_transacao)}
                        </p>
                        {isOverdue(transaction.data_vencimento || transaction.data_transacao, transaction.status) && (
                          <p className="text-xs text-red-600 font-medium">Vencida</p>
                        )}
                      </div>
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
                        <option value="vencido">Vencido</option>
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
                {editingTransaction ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
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
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Descrição da despesa"
                  />
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Observações adicionais sobre a conta..."
                  />
                </div>

                {/* Seção de Recorrência */}
                <div className="md:col-span-2">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="e_recorrente"
                        checked={formData.e_recorrente || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          e_recorrente: e.target.checked,
                          tipo_recorrencia: e.target.checked ? 'parcelada' : null,
                          numero_parcelas: e.target.checked ? 2 : null,
                          valor_parcela: e.target.checked && formData.valor ? Number(formData.valor) / 2 : null,
                          data_inicio_recorrencia: e.target.checked ? formData.data_transacao : null
                        })}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="e_recorrente" className="text-sm font-medium text-gray-700">
                        Despesa Recorrente
                      </label>
                    </div>

                    {formData.e_recorrente && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tipo de Recorrência *
                            </label>
                            <select
                              required={formData.e_recorrente}
                              value={formData.tipo_recorrencia || ''}
                              onChange={(e) => setFormData({ ...formData, tipo_recorrencia: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                                required={formData.tipo_recorrencia === 'parcelada'}
                                value={formData.numero_parcelas || ''}
                                onChange={(e) => {
                                  const parcelas = Number(e.target.value);
                                  setFormData({ 
                                    ...formData, 
                                    numero_parcelas: parcelas,
                                    valor_parcela: parcelas > 0 && formData.valor ? Number(formData.valor) / parcelas : null
                                  });
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Ex: 12"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Data de Início da Recorrência *
                            </label>
                            <input
                              type="date"
                              required={formData.e_recorrente}
                              value={formData.data_inicio_recorrencia || ''}
                              onChange={(e) => setFormData({ ...formData, data_inicio_recorrencia: e.target.value })}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Valor por Parcela
                            </label>
                            <input
                              type="text"
                              value={formData.valor_parcela ? formatCurrency(formData.valor_parcela) : ''}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                              disabled
                              placeholder="Calculado automaticamente"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas 
                                ? `${formatCurrency(Number(formData.valor))} ÷ ${formData.numero_parcelas} parcelas`
                                : 'Valor igual ao total para assinaturas'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Simulação do Parcelamento */}
                        {formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas && formData.valor_parcela && formData.data_inicio_recorrencia && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-3">📋 Simulação do Parcelamento</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {Array.from({ length: formData.numero_parcelas }, (_, index) => {
                                const parcelaNum = index + 1;
                                const dataVencimento = new Date(formData.data_inicio_recorrencia!);
                                dataVencimento.setMonth(dataVencimento.getMonth() + index);
                                
                                return (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-blue-800">
                                      Parcela {parcelaNum}/{formData.numero_parcelas} - {dataVencimento.toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="font-semibold text-blue-900">
                                      {formatCurrency(formData.valor_parcela)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                              <span className="font-semibold text-blue-900">Total:</span>
                              <span className="font-bold text-blue-900">{formatCurrency(Number(formData.valor))}</span>
                            </div>
                          </div>
                        )}

                        {formData.tipo_recorrencia === 'assinatura' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-semibold text-purple-900 mb-2">🔄 Assinatura Mensal</h4>
                            <div className="text-sm text-purple-800 space-y-1">
                              <p>• Valor mensal: {formatCurrency(Number(formData.valor))}</p>
                              <p>• Início: {formData.data_inicio_recorrencia ? new Date(formData.data_inicio_recorrencia).toLocaleDateString('pt-BR') : '-'}</p>
                              <p>• Próximas cobranças serão criadas automaticamente</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção de Recorrência */}
                <div className="md:col-span-2">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="e_recorrente"
                        checked={formData.e_recorrente || false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          e_recorrente: e.target.checked,
                          tipo_recorrencia: e.target.checked ? 'parcelada' : null,
                          numero_parcelas: e.target.checked ? 2 : null,
                          valor_parcela: e.target.checked ? Number(formData.valor) : null,
                          data_inicio_recorrencia: e.target.checked ? formData.data_transacao : null
                        })}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor="e_recorrente" className="text-sm font-medium text-gray-700">
                        Despesa Recorrente
                      </label>
                    </div>

                    {formData.e_recorrente && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de Recorrência *
                          </label>
                          <select
                            required={formData.e_recorrente}
                            value={formData.tipo_recorrencia || ''}
                            onChange={(e) => setFormData({ ...formData, tipo_recorrencia: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                              required={formData.tipo_recorrencia === 'parcelada'}
                              value={formData.numero_parcelas || ''}
                              onChange={(e) => {
                                const parcelas = Number(e.target.value);
                                setFormData({ 
                                  ...formData, 
                                  numero_parcelas: parcelas,
                                  valor_parcela: parcelas > 0 ? Number(formData.valor) / parcelas : null
                                });
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Ex: 12"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data de Início da Recorrência *
                          </label>
                          <input
                            type="date"
                            required={formData.e_recorrente}
                            value={formData.data_inicio_recorrencia || ''}
                            onChange={(e) => setFormData({ ...formData, data_inicio_recorrencia: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor por Parcela
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.valor_parcela || ''}
                            onChange={(e) => setFormData({ ...formData, valor_parcela: Number(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50"
                            disabled
                            placeholder="Calculado automaticamente"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {formData.tipo_recorrencia === 'parcelada' && formData.numero_parcelas 
                              ? `Valor total ÷ ${formData.numero_parcelas} parcelas`
                              : 'Valor igual ao total para assinaturas'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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
                  {editingTransaction ? 'Atualizar' : 'Criar'} Conta
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
                  Detalhes da Conta a Pagar #{viewingTransaction.id_sequencial}
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
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(viewingTransaction.valor)}</p>
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
                  {isOverdue(viewingTransaction.data_vencimento || viewingTransaction.data_transacao, viewingTransaction.status) && (
                    <p className="text-sm text-red-600 font-medium">⚠️ Vencida</p>
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
            </div>
          </div>
        </div>
      )}
    data_inicio_recorrencia: transaction.data_inicio_recorrencia,
    valor_parcela: transaction.valor_parcela,
    ativa_recorrencia: transaction.ativa_recorrencia,
    </div>
  );
};

export default AccountsPayable;