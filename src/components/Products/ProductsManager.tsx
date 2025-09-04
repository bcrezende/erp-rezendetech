import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Hash, Tag } from 'lucide-react';
import { Database } from '../../types/supabase';

type Product = Database['public']['Tables']['produtos_servicos']['Row'];
type ProductInsert = Database['public']['Tables']['produtos_servicos']['Insert'];

const ProductsManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<Partial<ProductInsert>>({
    nome: '',
    descricao: '',
    preco: 0,
    sku: '',
    e_servico: false,
    estoque_atual: 0,
    estoque_minimo: 0,
    categoria: '',
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadProducts();
    }
  }, [profile]);

  const loadProducts = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('produtos_servicos')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!profile?.id_empresa) return;

    try {
      // Check for duplicate SKU if SKU is provided
      if (formData.sku && formData.sku.trim()) {
        const normalizedSku = formData.sku.trim().toUpperCase();
        let query = supabase
          .from('produtos_servicos')
          .select('id')
          .eq('id_empresa', profile.id_empresa)
          .eq('sku', normalizedSku);

        // If editing, exclude current product from check
        if (editingProduct) {
          query = query.neq('id', editingProduct.id);
        }

        const { data: existingProduct, error: checkError } = await query.single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingProduct) {
          setError('SKU já existe para esta empresa. Por favor, use um SKU diferente.');
          return;
        }
      }

      const productData = {
        ...formData,
        id_empresa: profile.id_empresa,
        sku: formData.sku?.trim().toUpperCase() || null,
        preco: Number(formData.preco),
        estoque_atual: Number(formData.estoque_atual),
        estoque_minimo: Number(formData.estoque_minimo),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('produtos_servicos')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('produtos_servicos')
          .insert(productData);

        if (error) throw error;
      }

      await loadProducts();
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Erro ao salvar produto. Tente novamente.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      nome: product.nome,
      descricao: product.descricao,
      preco: product.preco,
      sku: product.sku,
      e_servico: product.e_servico,
      estoque_atual: product.estoque_atual,
      estoque_minimo: product.estoque_minimo,
      categoria: product.categoria,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto/serviço?')) return;

    try {
      const { error } = await supabase
        .from('produtos_servicos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const resetForm = () => {
    setError('');
    setFormData({
      nome: '',
      descricao: '',
      preco: 0,
      sku: '',
      e_servico: false,
      estoque_atual: 0,
      estoque_minimo: 0,
      categoria: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredProducts = products.filter(product =>
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos e Serviços</h1>
            <p className="text-gray-600">Gerencie seu catálogo</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Novo Item</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar produtos e serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.nome}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.e_servico 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {product.e_servico ? 'Serviço' : 'Produto'}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  ID: {product.id_sequencial}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {product.descricao && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {product.descricao}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign size={14} />
                  <span>Preço:</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(product.preco)}
                </span>
              </div>

              {product.sku && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Hash size={14} />
                  <span>SKU: {product.sku}</span>
                </div>
              )}

              {product.categoria && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Tag size={14} />
                  <span>{product.categoria}</span>
                </div>
              )}

              {!product.e_servico && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Estoque:</span>
                  <span className={`font-medium ${
                    product.estoque_atual <= product.estoque_minimo 
                      ? 'text-red-600' 
                      : 'text-gray-900'
                  }`}>
                    {product.estoque_atual} un.
                  </span>
                </div>
              )}
            </div>

            {!product.e_servico && product.estoque_atual <= product.estoque_minimo && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-xs text-red-700 font-medium">
                  ⚠️ Estoque baixo
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum item encontrado
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Tente ajustar sua busca' : 'Comece adicionando seu primeiro produto ou serviço'}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Editar Item' : 'Novo Produto/Serviço'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descricao || ''}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.preco || ''}
                    onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.e_servico || false}
                      onChange={(e) => setFormData({ ...formData, e_servico: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      É um serviço (não controla estoque)
                    </span>
                  </label>
                </div>

                {!formData.e_servico && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estoque Atual
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.estoque_atual || ''}
                        onChange={(e) => setFormData({ ...formData, estoque_atual: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estoque Mínimo
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.estoque_minimo || ''}
                        onChange={(e) => setFormData({ ...formData, estoque_minimo: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
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
                  {editingProduct ? 'Atualizar' : 'Criar'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsManager;