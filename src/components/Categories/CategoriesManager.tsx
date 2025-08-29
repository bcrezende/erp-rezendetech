import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, Tag, Palette, Settings } from 'lucide-react';
import { Database } from '../../types/supabase';

type Category = Database['public']['Tables']['categorias']['Row'];
type CategoryInsert = Database['public']['Tables']['categorias']['Insert'];

const CategoriesManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [formData, setFormData] = useState<Partial<CategoryInsert>>({
    nome: '',
    tipo: 'receita',
    cor: '#6B7280',
    classificacao_dre: null,
    id_usuario: null,
    is_personal: false,
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadCategories();
    }
  }, [profile]);

  const loadCategories = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setCategories([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .order('tipo')
        .order('nome');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa || !profile?.id) return;

    try {
      const categoryData = {
        ...formData,
        id_empresa: profile.id_empresa,
        // Se for categoria pessoal, definir id_usuario; senão, deixar null (categoria da empresa)
        id_usuario: (formData as any).is_personal ? profile.id : null,
        // Se for receita, não precisa de classificação DRE
        classificacao_dre: formData.tipo === 'receita' ? null : formData.classificacao_dre,
      };

      // Remove is_personal do objeto antes de enviar (não existe na tabela)
      delete (categoryData as any).is_personal;
      if (editingCategory) {
        const { error } = await supabase
          .from('categorias')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert(categoryData);

        if (error) throw error;
      }

      await loadCategories();
      resetForm();
      alert(editingCategory ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erro ao salvar categoria. Tente novamente.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nome: category.nome,
      tipo: category.tipo,
      cor: category.cor,
      classificacao_dre: category.classificacao_dre,
      id_usuario: category.id_usuario,
      is_personal: category.id_usuario !== null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
      await loadCategories();
      alert('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erro ao excluir categoria.');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'receita',
      cor: '#6B7280',
      classificacao_dre: null,
      id_usuario: null,
      is_personal: false,
    });
    setEditingCategory(null);
    setShowForm(false);
  };
  // Função para criar categorias padrão da empresa
  const createDefaultCategories = async () => {
    if (!profile?.id_empresa) return;

    const defaultCategories = [
      // Categorias de Receita
      { nome: 'Vendas de Produtos', tipo: 'receita', cor: '#10B981' },
      { nome: 'Prestação de Serviços', tipo: 'receita', cor: '#3B82F6' },
      { nome: 'Outras Receitas', tipo: 'receita', cor: '#8B5CF6' },
      
      // Categorias de Despesa
      { nome: 'Material de Escritório', tipo: 'despesa', cor: '#F59E0B', classificacao_dre: 'despesa_operacional' },
      { nome: 'Energia Elétrica', tipo: 'despesa', cor: '#EF4444', classificacao_dre: 'custo_fixo' },
      { nome: 'Telefone/Internet', tipo: 'despesa', cor: '#06B6D4', classificacao_dre: 'custo_fixo' },
      { nome: 'Aluguel', tipo: 'despesa', cor: '#84CC16', classificacao_dre: 'custo_fixo' },
      { nome: 'Fornecedores', tipo: 'despesa', cor: '#F97316', classificacao_dre: 'custo_variavel' },
      { nome: 'Marketing', tipo: 'despesa', cor: '#EC4899', classificacao_dre: 'despesa_operacional' },
      { nome: 'Combustível', tipo: 'despesa', cor: '#6366F1', classificacao_dre: 'despesa_operacional' },
      { nome: 'Alimentação', tipo: 'despesa', cor: '#14B8A6', classificacao_dre: 'despesa_operacional' }
    ];

    try {
      const categoriesToInsert = defaultCategories.map(cat => ({
        ...cat,
        id_empresa: profile.id_empresa,
        id_usuario: null // Categorias da empresa
      }));

      const { error } = await supabase
        .from('categorias')
        .insert(categoriesToInsert);

      if (error) throw error;

      await loadCategories();
      alert('Categorias padrão criadas com sucesso!');
    } catch (error) {
      console.error('Error creating default categories:', error);
      alert('Erro ao criar categorias padrão. Algumas podem já existir.');
    }
  };

  const getClassificationLabel = (classification: string | null) => {
    const labels = {
      custo_fixo: 'Custo Fixo',
      custo_variavel: 'Custo Variável',
      despesa_operacional: 'Despesa Operacional'
    };
    return classification ? labels[classification as keyof typeof labels] : '-';
  };

  const getClassificationColor = (classification: string | null) => {
    const colors = {
      custo_fixo: 'bg-red-100 text-red-700',
      custo_variavel: 'bg-orange-100 text-orange-700',
      despesa_operacional: 'bg-blue-100 text-blue-700'
    };
    return classification ? colors[classification as keyof typeof colors] : 'bg-gray-100 text-gray-700';
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || category.tipo === filterType;
    
    let matchesOwnership = true;
    if (filterOwnership === 'empresa') {
      matchesOwnership = category.id_usuario === null;
    } else if (filterOwnership === 'pessoal') {
      matchesOwnership = category.id_usuario === profile?.id;
    }
    
    return matchesSearch && matchesType && matchesOwnership;
  });

  const groupedCategories = {
    receita: filteredCategories.filter(c => c.tipo === 'receita'),
    despesa: filteredCategories.filter(c => c.tipo === 'despesa')
  };

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
          <Tag className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-600">Gerencie categorias e classificações para DRE</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {categories.length === 0 && (
            <button
              onClick={createDefaultCategories}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Settings size={20} />
              <span>Criar Categorias Padrão</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>

          <select
            value={filterOwnership}
            onChange={(e) => setFilterOwnership(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as categorias</option>
            <option value="empresa">Da empresa</option>
            <option value="pessoal">Pessoais</option>
          </select>
        </div>
      </div>

      {/* Categories by Type */}
      <div className="space-y-6">
        {/* Receitas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Categorias de Receita ({groupedCategories.receita.length})</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedCategories.receita.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.cor }}
                    ></div>
                    <h4 className="font-semibold text-gray-900">{category.nome}</h4>
                    {category.id_usuario && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Pessoal
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    {/* Só permite deletar categorias pessoais */}
                    {category.id_usuario && (
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">ID: {category.id_sequencial}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Categorias de Despesa ({groupedCategories.despesa.length})</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedCategories.despesa.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.cor }}
                    ></div>
                    <h4 className="font-semibold text-gray-900">{category.nome}</h4>
                    {category.id_usuario && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Pessoal
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    {/* Só permite deletar categorias pessoais */}
                    {category.id_usuario && (
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getClassificationColor(category.classificacao_dre)}`}>
                    {getClassificationLabel(category.classificacao_dre)}
                  </span>
                  <p className="text-xs text-gray-500">ID: {category.id_sequencial}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando sua primeira categoria'}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    required
                    value={formData.tipo || ''}
                    onChange={(e) => {
                      const newTipo = e.target.value as 'receita' | 'despesa';
                      setFormData({ 
                        ...formData, 
                        tipo: newTipo,
                        // Reset classificação quando mudar tipo
                        classificacao_dre: newTipo === 'receita' ? null : 'despesa_operacional'
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                {formData.tipo === 'despesa' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Classificação DRE *
                    </label>
                    <select
                      required
                      value={formData.classificacao_dre || ''}
                      onChange={(e) => setFormData({ ...formData, classificacao_dre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma classificação</option>
                      <option value="despesa_operacional">Despesa Operacional</option>
                      <option value="custo_fixo">Custo Fixo</option>
                      <option value="custo_variavel">Custo Variável</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Esta classificação será usada no cálculo do DRE
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.cor || '#6B7280'}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.cor || '#6B7280'}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#6B7280"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibilidade da Categoria
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="visibility"
                        checked={!(formData as any).is_personal}
                        onChange={() => setFormData({ ...formData, is_personal: false } as any)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Para toda a empresa</span>
                        <p className="text-sm text-gray-600">Todos os usuários da empresa poderão usar esta categoria</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="visibility"
                        checked={(formData as any).is_personal}
                        onChange={() => setFormData({ ...formData, is_personal: true } as any)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Pessoal</span>
                        <p className="text-sm text-gray-600">Apenas você poderá usar esta categoria</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Explicação das Classificações */}
              {formData.tipo === 'despesa' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Classificações DRE</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Despesa Operacional:</strong> Gastos diretos da operação (ex: material, energia, telefone)</p>
                    <p><strong>Custo Fixo:</strong> Gastos que não variam com vendas (ex: aluguel, salários, seguros)</p>
                    <p><strong>Custo Variável:</strong> Gastos que variam com vendas (ex: comissões, fretes, matéria-prima)</p>
                  </div>
                </div>
              )}

              {/* Explicação sobre Visibilidade */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">👥 Visibilidade das Categorias</h4>
                <div className="text-sm text-purple-800 space-y-1">
                  <p><strong>Para toda a empresa:</strong> Categoria compartilhada - todos os usuários da empresa podem usar</p>
                  <p><strong>Pessoal:</strong> Categoria privada - apenas você pode ver e usar esta categoria</p>
                  <p className="text-xs text-purple-700 mt-2">
                    💡 Categorias pessoais são úteis para organizar gastos específicos do seu departamento ou função
                  </p>
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
                  {editingCategory ? 'Atualizar' : 'Criar'} Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesManager;