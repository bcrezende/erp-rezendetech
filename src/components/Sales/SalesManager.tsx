import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, ShoppingCart, Eye, FileText, DollarSign, Package, Users, Calendar } from 'lucide-react';
import { Database } from '../../types/supabase';

type Pessoa = Database['public']['Tables']['pessoas']['Row'];
type Product = Database['public']['Tables']['produtos_servicos']['Row'];
type Venda = Database['public']['Tables']['vendas']['Row'];
type VendaInsert = Database['public']['Tables']['vendas']['Insert'];
type VendaItem = Database['public']['Tables']['vendas_itens']['Row'];
type VendaItemInsert = Database['public']['Tables']['vendas_itens']['Insert'];

interface VendaWithDetails extends Venda {
  pessoa_nome: string;
  itens: (VendaItem & { produto_nome: string })[];
}

const SalesManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [vendas, setVendas] = useState<VendaWithDetails[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVenda, setEditingVenda] = useState<VendaWithDetails | null>(null);
  const [viewingVenda, setViewingVenda] = useState<VendaWithDetails | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    pessoa: 'all',
    period: 'all'
  });

  const [formData, setFormData] = useState({
    id_pessoa: '',
    itens: [] as Array<{
      id_produto: string;
      produto_nome: string;
      quantidade: number;
      preco_unitario: number;
      preco_total: number;
    }>,
    desconto: 0,
    observacoes: '',
    status: 'draft' as 'draft' | 'confirmed' | 'delivered' | 'cancelled',
    data_venda: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setPessoas([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      const [vendasRes, pessoasRes, productsRes] = await Promise.all([
        loadVendas(),
        supabase.from('pessoas').select('*').eq('id_empresa', profile.id_empresa).eq('tipo_cadastro', 'cliente').eq('ativo', true).order('nome_razao_social'),
        supabase.from('produtos_servicos').select('*').eq('id_empresa', profile.id_empresa).eq('ativo', true).order('nome')
      ]);

      if (pessoasRes.error) throw pessoasRes.error;
      if (productsRes.error) throw productsRes.error;

      setPessoas(pessoasRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendas = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setVendas([]);
        return;
      }

      // Carregar vendas com dados do cliente
      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select(`
          *,
          pessoas!inner(nome_razao_social)
        `)
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .order('criado_em', { ascending: false });

      if (vendasError) throw vendasError;

      // Carregar itens das vendas
      const vendasWithDetails: VendaWithDetails[] = [];
      
      for (const venda of vendasData || []) {
        const { data: itensData, error: itensError } = await supabase
          .from('vendas_itens')
          .select(`
            *,
            produtos_servicos!inner(nome)
          `)
          .eq('id_venda', venda.id);

        if (itensError) throw itensError;

        const itensWithNames = (itensData || []).map(item => ({
          ...item,
          produto_nome: (item as any).produtos_servicos.nome
        }));

        vendasWithDetails.push({
          ...venda,
          pessoa_nome: (venda as any).pessoas.nome_razao_social,
          itens: itensWithNames
        });
      }

      setVendas(vendasWithDetails);
    } catch (error) {
      console.error('Error loading vendas:', error);
    }
  };

  const addItem = () => {
    const newItem = {
      id_produto: '',
      produto_nome: '',
      quantidade: 1,
      preco_unitario: 0,
      preco_total: 0
    };
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, newItem]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.itens];
    
    if (field === 'id_produto') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          id_produto: value,
          produto_nome: product.nome,
          preco_unitario: Number(product.preco) || 0
        };
        // Recalcular total do item
        updatedItems[index].preco_total = updatedItems[index].quantidade * updatedItems[index].preco_unitario;
      }
    } else if (field === 'quantidade') {
      updatedItems[index] = {
        ...updatedItems[index],
        quantidade: Number(value) || 0
      };
      // Recalcular total do item
      updatedItems[index].preco_total = updatedItems[index].quantidade * updatedItems[index].preco_unitario;
    } else if (field === 'preco_unitario') {
      updatedItems[index] = {
        ...updatedItems[index],
        preco_unitario: Number(value) || 0
      };
      // Recalcular total do item
      updatedItems[index].preco_total = updatedItems[index].quantidade * updatedItems[index].preco_unitario;
    }

    setFormData(prev => ({ ...prev, itens: updatedItems }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.itens.reduce((sum, item) => {
      return sum + (Number(item.preco_total) || 0);
    }, 0);
    const total = subtotal - (Number(formData.desconto) || 0);
    return { subtotal, total: Math.max(0, total) };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa || formData.itens.length === 0) return;

    try {
      const { subtotal, total } = calculateTotals();

      const vendaData: VendaInsert = {
        id_empresa: profile.id_empresa,
        id_pessoa: formData.id_pessoa,
        data_venda: formData.data_venda,
        subtotal,
        desconto: Number(formData.desconto) || 0,
        total,
        status: formData.status,
        observacoes: formData.observacoes || null
      };

      let vendaId: string;

      if (editingVenda) {
        // Atualizar venda existente
        const { error: vendaError } = await supabase
          .from('vendas')
          .update(vendaData)
          .eq('id', editingVenda.id);

        if (vendaError) throw vendaError;

        // Remover itens antigos
        const { error: deleteItensError } = await supabase
          .from('vendas_itens')
          .delete()
          .eq('id_venda', editingVenda.id);

        if (deleteItensError) throw deleteItensError;

        vendaId = editingVenda.id;
      } else {
        // Criar nova venda
        const { data: vendaResult, error: vendaError } = await supabase
          .from('vendas')
          .insert(vendaData)
          .select()
          .single();

        if (vendaError) throw vendaError;
        vendaId = vendaResult.id;
      }

      // Inserir itens da venda
      const itensData: VendaItemInsert[] = formData.itens.map(item => ({
        id_venda: vendaId,
        id_produto: item.id_produto,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total
      }));

      const { error: itensError } = await supabase
        .from('vendas_itens')
        .insert(itensData);

      if (itensError) throw itensError;

      // Criar transação financeira se a venda for confirmada
      if (formData.status === 'confirmed' && total > 0) {
        const pessoa = pessoas.find(p => p.id === formData.id_pessoa);
        await supabase.from('transacoes').insert({
          id_empresa: profile.id_empresa,
          valor: total,
          tipo: 'receita',
          descricao: `Venda - ${pessoa?.nome_razao_social}`,
          data_transacao: formData.data_venda,
          id_pessoa: formData.id_pessoa,
          status: 'concluida',
          origem: 'manual'
        });
      }

      await loadVendas();
      resetForm();
    } catch (error) {
      console.error('Error saving venda:', error);
      alert('Erro ao salvar venda. Tente novamente.');
    }
  };

  const handleStatusChange = async (vendaId: string, newStatus: string) => {
    try {
      const venda = vendas.find(v => v.id === vendaId);
      if (!venda) return;

      const { error } = await supabase
        .from('vendas')
        .update({ status: newStatus })
        .eq('id', vendaId);

      if (error) throw error;

      // Criar transação financeira quando confirmar venda
      if (newStatus === 'confirmed' && venda.status !== 'confirmed' && venda.total > 0) {
        await supabase.from('transacoes').insert({
          id_empresa: profile?.id_empresa,
          valor: venda.total,
          tipo: 'receita',
          descricao: `Venda #${venda.id_sequencial} - ${venda.pessoa_nome}`,
          data_transacao: venda.data_venda,
          id_pessoa: venda.id_pessoa,
          status: 'concluida',
          origem: 'manual'
        });
      }

      await loadVendas();
    } catch (error) {
      console.error('Error updating venda status:', error);
      alert('Erro ao atualizar status da venda.');
    }
  };

  const handleEdit = (venda: VendaWithDetails) => {
    setEditingVenda(venda);
    setFormData({
      id_pessoa: venda.id_pessoa,
      itens: venda.itens.map(item => ({
        id_produto: item.id_produto,
        produto_nome: item.produto_nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total
      })),
      desconto: venda.desconto,
      observacoes: venda.observacoes || '',
      status: venda.status as any,
      data_venda: venda.data_venda
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;

    try {
      // Soft delete - marcar como inativo
      const { error } = await supabase
        .from('vendas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      await loadVendas();
      alert('Venda excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting venda:', error);
      alert('Erro ao excluir venda. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      id_pessoa: '',
      itens: [],
      desconto: 0,
      observacoes: '',
      status: 'draft',
      data_venda: new Date().toISOString().split('T')[0]
    });
    setEditingVenda(null);
    setShowForm(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Rascunho',
      confirmed: 'Confirmada',
      delivered: 'Entregue',
      cancelled: 'Cancelada'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const filteredVendas = vendas.filter(venda => {
    const matchesSearch = venda.pessoa_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venda.id_sequencial.toString().includes(searchTerm);
    const matchesStatus = filters.status === 'all' || venda.status === filters.status;
    const matchesPessoa = filters.pessoa === 'all' || venda.id_pessoa === filters.pessoa;
    
    return matchesSearch && matchesStatus && matchesPessoa;
  });

  const totals = filteredVendas.reduce((acc, venda) => {
    if (venda.status !== 'cancelled') {
      acc.total += venda.total;
      acc.count += 1;
    }
    return acc;
  }, { total: 0, count: 0 });

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
          <ShoppingCart className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
            <p className="text-gray-600">Gerencie pedidos e faturamento</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Venda</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pedidos</p>
              <p className="text-3xl font-bold text-blue-600">
                {totals.count}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(totals.count > 0 ? totals.total / totals.count : 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Package className="text-orange-600" size={24} />
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
              placeholder="Buscar vendas..."
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
            <option value="draft">Rascunho</option>
            <option value="confirmed">Confirmada</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <select
            value={filters.pessoa}
            onChange={(e) => setFilters({ ...filters, pessoa: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os clientes</option>
            {pessoas.filter(p => p.tipo_cadastro === 'cliente').map(pessoa => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.nome_razao_social}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">#</th>
                <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                <th className="text-left p-4 font-medium text-gray-600">Data</th>
                <th className="text-right p-4 font-medium text-gray-600">Total</th>
                <th className="text-center p-4 font-medium text-gray-600">Status</th>
                <th className="text-center p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>Nenhuma venda encontrada</p>
                    <p className="text-sm">Clique em "Nova Venda" para começar</p>
                  </td>
                </tr>
              ) : (
                filteredVendas.map((venda) => (
                  <tr key={venda.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">
                      #{venda.id_sequencial}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">{venda.pessoa_nome}</p>
                        <p className="text-sm text-gray-500">{venda.itens.length} item(s)</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-900">
                      {formatDate(venda.data_venda)}
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-900">
                      {formatCurrency(venda.total)}
                    </td>
                    <td className="p-4 text-center">
                      <select
                        value={venda.status}
                        onChange={(e) => handleStatusChange(venda.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-sm font-medium border-0 ${getStatusColor(venda.status)}`}
                      >
                        <option value="draft">Rascunho</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="delivered">Entregue</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setViewingVenda(venda)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(venda)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(venda.id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingVenda ? 'Editar Venda' : 'Nova Venda'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select
                    required
                    value={formData.id_pessoa}
                    onChange={(e) => setFormData({ ...formData, id_pessoa: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um cliente</option>
                    {pessoas.filter(p => p.tipo_cadastro === 'cliente').map(pessoa => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.nome_razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Venda *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_venda}
                    onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Itens da Venda</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span>Adicionar Item</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.itens.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Produto/Serviço
                        </label>
                        <select
                          value={item.id_produto}
                          onChange={(e) => updateItem(index, 'id_produto', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preço Unitário
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.preco_unitario}
                          onChange={(e) => updateItem(index, 'preco_unitario', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <input
                          type="text"
                          value={formatCurrency(item.preco_total)}
                          disabled
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-full p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formData.itens.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>Nenhum item adicionado</p>
                      <p className="text-sm">Clique em "Adicionar Item" para começar</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals */}
              {formData.itens.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">{formatCurrency(calculateTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="text-gray-600">Desconto:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.desconto}
                        onChange={(e) => setFormData({ ...formData, desconto: Number(e.target.value) })}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-right"
                      />
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(calculateTotals().total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    rows={3}
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observações sobre a venda..."
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
                  disabled={formData.itens.length === 0 || !formData.id_pessoa}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingVenda ? 'Atualizar' : 'Criar'} Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Sale Modal */}
      {viewingVenda && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Venda #{viewingVenda.id_sequencial}
                </h2>
                <button
                  onClick={() => setViewingVenda(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Pessoa</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingVenda.pessoa_nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingVenda.data_venda)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingVenda.status)}`}>
                    {getStatusLabel(viewingVenda.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Total</label>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(viewingVenda.total)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Itens</h3>
                <div className="space-y-2">
                  {viewingVenda.itens.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.produto_nome}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantidade}x {formatCurrency(item.preco_unitario)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.preco_total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(viewingVenda.subtotal)}</span>
                  </div>
                  {viewingVenda.desconto > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Desconto:</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(viewingVenda.desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-blue-600">{formatCurrency(viewingVenda.total)}</span>
                  </div>
                </div>
              </div>

              {viewingVenda.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingVenda.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManager;