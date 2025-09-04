import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, FileText, User, Building } from 'lucide-react';
import { Database } from '../../types/supabase';

type Pessoa = Database['public']['Tables']['pessoas']['Row'];
type PessoaInsert = Database['public']['Tables']['pessoas']['Insert'];

const PeopleManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Pessoa | null>(null);
  const [viewingPessoa, setViewingPessoa] = useState<Pessoa | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState<Partial<PessoaInsert>>({
    nome_razao_social: '',
    tipo_cadastro: 'cliente',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    observacoes: '',
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadPessoas();
    }
  }, [profile]);

  const loadPessoas = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setPessoas([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pessoas')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .order('nome_razao_social');

      if (error) throw error;
      setPessoas(data || []);
    } catch (error) {
      console.error('Error loading pessoas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa) return;

    try {
      const pessoaData = {
        ...formData,
        id_empresa: profile.id_empresa,
      };

      if (editingPessoa) {
        const { error } = await supabase
          .from('pessoas')
          .update(pessoaData)
          .eq('id', editingPessoa.id);

        if (error) throw error;
        alert('Pessoa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('pessoas')
          .insert(pessoaData);

        if (error) throw error;
        alert('Pessoa criada com sucesso!');
      }

      await loadPessoas();
      resetForm();
    } catch (error) {
      console.error('Error saving pessoa:', error);
      alert('Erro ao salvar pessoa. Tente novamente.');
    }
  };

  const handleEdit = (pessoa: Pessoa) => {
    setEditingPessoa(pessoa);
    setFormData({
      nome_razao_social: pessoa.nome_razao_social,
      tipo_cadastro: pessoa.tipo_cadastro,
      cpf_cnpj: pessoa.cpf_cnpj,
      email: pessoa.email,
      telefone: pessoa.telefone,
      endereco: pessoa.endereco,
      observacoes: pessoa.observacoes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('pessoas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadPessoas();
      alert('Pessoa excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting pessoa:', error);
      alert('Erro ao excluir pessoa. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      nome_razao_social: '',
      tipo_cadastro: 'cliente',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      observacoes: '',
    });
    setEditingPessoa(null);
    setShowForm(false);
  };

  const getTypeColor = (tipo: string) => {
    const colors = {
      cliente: 'bg-blue-100 text-blue-700',
      fornecedor: 'bg-green-100 text-green-700',
      colaborador: 'bg-purple-100 text-purple-700',
      outro: 'bg-gray-100 text-gray-700'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (tipo: string) => {
    const labels = {
      cliente: 'Cliente',
      fornecedor: 'Fornecedor',
      colaborador: 'Colaborador',
      outro: 'Outro'
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'cliente':
        return User;
      case 'fornecedor':
        return Building;
      case 'colaborador':
        return Users;
      default:
        return FileText;
    }
  };

  const filteredPessoas = pessoas.filter(pessoa => {
    const matchesSearch = pessoa.nome_razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pessoa.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pessoa.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || pessoa.tipo_cadastro === filterType;
    
    return matchesSearch && matchesType;
  });

  const groupedPessoas = {
    cliente: filteredPessoas.filter(p => p.tipo_cadastro === 'cliente'),
    fornecedor: filteredPessoas.filter(p => p.tipo_cadastro === 'fornecedor'),
    colaborador: filteredPessoas.filter(p => p.tipo_cadastro === 'colaborador'),
    outro: filteredPessoas.filter(p => p.tipo_cadastro === 'outro')
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
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Pessoas</h1>
            <p className="text-gray-600">Cadastro unificado de clientes, fornecedores e colaboradores</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Nova Pessoa</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes</p>
              <p className="text-3xl font-bold text-blue-600">
                {groupedPessoas.cliente.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <User className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fornecedores</p>
              <p className="text-3xl font-bold text-green-600">
                {groupedPessoas.fornecedor.length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Building className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Colaboradores</p>
              <p className="text-3xl font-bold text-purple-600">
                {groupedPessoas.colaborador.length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {filteredPessoas.length}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <FileText className="text-gray-600" size={24} />
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
              placeholder="Buscar pessoas..."
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
            <option value="cliente">Clientes</option>
            <option value="fornecedor">Fornecedores</option>
            <option value="colaborador">Colaboradores</option>
            <option value="outro">Outros</option>
          </select>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPessoas.map((pessoa) => {
          const TypeIcon = getTypeIcon(pessoa.tipo_cadastro);
          
          return (
            <div key={pessoa.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <TypeIcon size={20} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pessoa.nome_razao_social}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(pessoa.tipo_cadastro)}`}>
                      {getTypeLabel(pessoa.tipo_cadastro)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: {pessoa.id_sequencial}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewingPessoa(pessoa)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(pessoa)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(pessoa.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {pessoa.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Mail size={14} />
                    <span>{pessoa.email}</span>
                  </div>
                )}
                {pessoa.telefone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Phone size={14} />
                    <span>{pessoa.telefone}</span>
                  </div>
                )}
                {pessoa.endereco && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin size={14} />
                    <span className="line-clamp-2">{pessoa.endereco}</span>
                  </div>
                )}
              </div>

              {pessoa.cpf_cnpj && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Doc: {pessoa.cpf_cnpj}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPessoas.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma pessoa encontrada
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Tente ajustar sua busca' : 'Comece adicionando sua primeira pessoa'}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingPessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_razao_social || ''}
                    onChange={(e) => setFormData({ ...formData, nome_razao_social: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome completo ou razão social"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cadastro *
                  </label>
                  <select
                    required
                    value={formData.tipo_cadastro || ''}
                    onChange={(e) => setFormData({ ...formData, tipo_cadastro: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                    <option value="colaborador">Colaborador</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj || ''}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone || ''}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rua, número, bairro, cidade, estado, CEP"
                  />
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
                    placeholder="Informações adicionais sobre a pessoa..."
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
                  {editingPessoa ? 'Atualizar' : 'Criar'} Pessoa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Person Modal */}
      {viewingPessoa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalhes da Pessoa
                </h2>
                <button
                  onClick={() => setViewingPessoa(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Nome / Razão Social</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingPessoa.nome_razao_social}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Tipo</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(viewingPessoa.tipo_cadastro)}`}>
                    {getTypeLabel(viewingPessoa.tipo_cadastro)}
                  </span>
                </div>
                {viewingPessoa.cpf_cnpj && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">CPF / CNPJ</label>
                    <p className="text-lg font-semibold text-gray-900">{viewingPessoa.cpf_cnpj}</p>
                  </div>
                )}
                {viewingPessoa.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg font-semibold text-gray-900">{viewingPessoa.email}</p>
                  </div>
                )}
                {viewingPessoa.telefone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Telefone</label>
                    <p className="text-lg font-semibold text-gray-900">{viewingPessoa.telefone}</p>
                  </div>
                )}
              </div>

              {viewingPessoa.endereco && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Endereço</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingPessoa.endereco}</p>
                </div>
              )}

              {viewingPessoa.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Observações</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingPessoa.observacoes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Criado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingPessoa.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Atualizado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingPessoa.atualizado_em).toLocaleDateString('pt-BR')}
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

export default PeopleManager;