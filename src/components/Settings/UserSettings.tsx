import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useAppContext } from '../../contexts/AppContext';
import { User, Mail, Phone, MapPin, Save, AlertCircle, CheckCircle, Moon, Sun, Palette, Package } from 'lucide-react';
import { Database } from '../../types/supabase';
import SystemVersionInfo from './SystemVersionInfo';

type Profile = Database['public']['Tables']['perfis']['Row'];
type ProfileUpdate = Database['public']['Tables']['perfis']['Update'];

const UserSettings: React.FC = () => {
  const { user, profile, supabase } = useAuth();
  const { state, toggleTheme } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    nome_completo: '',
    telefone: '',
    endereco: '',
    cpf_cnpj: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        nome_completo: profile.nome_completo || '',
        telefone: profile.telefone || '',
        endereco: profile.endereco || '',
        cpf_cnpj: profile.cpf_cnpj || '',
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        cep: profile.cep || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!user?.id) {
        throw new Error('Usuário não encontrado');
      }

      const updateData: ProfileUpdate = {
        nome_completo: formData.nome_completo,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        cpf_cnpj: formData.cpf_cnpj || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null
      };

      const { error } = await supabase
        .from('perfis')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Perfil atualizado com sucesso!');
      
      // Recarregar a página para atualizar o perfil no AuthProvider
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Erro inesperado ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <User className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Usuário</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Palette className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aparência</h3>
            <p className="text-gray-600 dark:text-gray-300">Personalize a aparência do sistema</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tema do Sistema
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  state.theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Sun size={20} />
                <div className="text-left">
                  <p className="font-medium">Tema Claro</p>
                  <p className="text-xs opacity-75">Interface clara e limpa</p>
                </div>
              </button>

              <button
                onClick={toggleTheme}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  state.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Moon size={20} />
                <div className="text-left">
                  <p className="font-medium">Tema Escuro</p>
                  <p className="text-xs opacity-75">Reduz o cansaço visual</p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">💡 Sobre os Temas</h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>• <strong>Tema Claro:</strong> Interface tradicional com fundo branco e texto escuro</p>
                  <p>• <strong>Tema Escuro:</strong> Reduz o cansaço visual em ambientes com pouca luz</p>
                  <p>• Sua preferência é salva automaticamente no navegador</p>
                  <p>• O tema se aplica a todo o sistema, incluindo o chat IA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">
              {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{profile?.nome_completo || 'Usuário'}</h3>
            <p className="text-gray-600 dark:text-gray-300">{user?.email}</p>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
              profile?.papel === 'admin' ? 'bg-purple-100 text-purple-700' :
              profile?.papel === 'financeiro' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {profile?.papel === 'admin' ? 'Administrador' :
               profile?.papel === 'financeiro' ? 'Financeiro' :
               'Usuário'}
            </span>
          </div>
        </div>

        {/* Company Info */}
        {profile?.empresas && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Empresa Vinculada</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600">Nome</label>
                <p className="text-gray-900 dark:text-gray-100">{profile.empresas.nome}</p>
              </div>
              {profile.empresas.cnpj && (
                <div>
                  <label className="block text-xs font-medium text-gray-600">CNPJ</label>
                  <p className="text-gray-900 dark:text-gray-100">{profile.empresas.cnpj}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600">Plano</label>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  profile.empresas.plano === 'enterprise' || profile.empresas.plano === 'empresarial' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {profile.empresas.plano === 'enterprise' || profile.empresas.plano === 'empresarial' ? 'Empresarial' :
                   'Básico'}
                </span>
              </div>
              {profile.empresas.assinatura_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-600">ID da Assinatura</label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-xs">{profile.empresas.assinatura_id}</p>
                </div>
              )}
              {profile.assinatura_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-600">ID da Assinatura do Usuário</label>
                  <p className="text-gray-900 dark:text-gray-100 font-mono text-xs">{profile.assinatura_id}</p>
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              💡 Para editar informações da empresa, acesse: Configurações → Empresa
            </div>
          </div>
        )}
      </div>

      {/* Personal Information Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Informações Pessoais</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="nome_completo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="nome_completo"
                  name="nome_completo"
                  type="text"
                  required
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cpf_cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPF
              </label>
              <input
                id="cpf_cnpj"
                name="cpf_cnpj"
                type="text"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CEP
              </label>
              <input
                id="cep"
                name="cep"
                type="text"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="00000-000"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Endereço Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Sua cidade"
              />
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Selecione o estado</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !formData.nome_completo.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações da Conta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
            <p className="text-gray-900 dark:text-gray-100">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">ID do Usuário</label>
            <p className="text-gray-900 dark:text-gray-100 font-mono text-xs">{user?.id}</p>
          </div>
          {profile?.assinatura_id && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">ID da Assinatura</label>
              <p className="text-gray-900 dark:text-gray-100 font-mono text-xs">{profile.assinatura_id}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Papel na Empresa</label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              profile?.papel === 'admin' ? 'bg-purple-100 text-purple-700' :
              profile?.papel === 'financeiro' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {profile?.papel === 'admin' ? 'Administrador' :
               profile?.papel === 'financeiro' ? 'Financeiro' :
               'Usuário'}
            </span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              profile?.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {profile?.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {profile?.criado_em && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Membro desde</label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(profile.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {profile?.atualizado_em && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Última atualização</label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(profile.atualizado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔒 Informações de Segurança</h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• Seus dados são protegidos por criptografia de ponta a ponta</p>
              <p>• Apenas você e administradores da sua empresa podem ver suas informações</p>
              <p>• Para alterar sua senha, use a opção "Esqueci minha senha" na tela de login</p>
              <p>• Para configurações da empresa, acesse o menu "Configurações → Empresa"</p>
              {profile?.assinatura_id && (
                <p>• Seu ID de assinatura é usado para validação de webhooks e integrações</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Version Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Package className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Versão do Sistema</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Informações sobre atualizações e histórico de versões
            </p>
          </div>
        </div>

        <SystemVersionInfo />
      </div>
    </div>
  );
};

export default UserSettings;