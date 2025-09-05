import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Building, Mail, Phone, MapPin, FileText, AlertCircle, CheckCircle, Save, CreditCard } from 'lucide-react';
import { Database } from '../../types/supabase';

type Empresa = Database['public']['Tables']['empresas']['Row'];
type EmpresaInsert = Database['public']['Tables']['empresas']['Insert'];
type EmpresaUpdate = Database['public']['Tables']['empresas']['Update'];

const CompanySettings: React.FC = () => {
  const { user, profile, supabase } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    plano: 'basico'
  });

  useEffect(() => {
    loadCompanyData();
  }, [profile]);

  const loadCompanyData = async () => {
    try {
      if (!profile?.id_empresa) {
        // Usuário ainda não tem empresa vinculada
        setEmpresa(null);
        setFormData({
          nome: '',
          cnpj: '',
          email: user?.email || '',
          telefone: profile?.telefone || '',
          endereco: '',
          cidade: '',
          estado: '',
          cep: '',
          plano: 'basico'
        });
        setLoading(false);
        return;
      }

      // Carregar dados da empresa existente
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', profile.id_empresa)
        .single();

      if (error) {
        console.error('Error loading company data:', error);
        setError('Erro ao carregar dados da empresa');
        setLoading(false);
        return;
      }

      setEmpresa(data);
      setFormData({
        nome: data.nome || '',
        cnpj: data.cnpj || '',
        email: data.email || '',
        telefone: data.telefone || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        plano: data.plano || 'basico'
      });
    } catch (err) {
      console.error('Error in loadCompanyData:', err);
      setError('Erro inesperado ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!user?.id) {
        throw new Error('Usuário não encontrado');
      }

      if (empresa) {
        // Atualizar empresa existente
        const updateData: EmpresaUpdate = {
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          plano: formData.plano
        };

        const { error } = await supabase
          .from('empresas')
          .update(updateData)
          .eq('id', empresa.id);

        if (error) throw error;

        setSuccess('Dados da empresa atualizados com sucesso!');
        await loadCompanyData(); // Recarregar dados
      } else {
        // Criar nova empresa - Solução alternativa sem Edge Function
        // Primeiro, vamos tentar criar a empresa diretamente
        const empresaData: EmpresaInsert = {
          nome: formData.nome,
          cnpj: formData.cnpj || null,
          email: formData.email || null,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          plano: formData.plano,
          ativo: true
        };

        // Tentar criar empresa usando RPC (função do banco)
        const { data: empresaResult, error: empresaError } = await supabase
          .rpc('create_empresa_and_link_profile', {
            p_user_id: user.id,
            p_nome: formData.nome,
            p_cnpj: formData.cnpj || null,
            p_email: formData.email || null,
            p_telefone: formData.telefone || null,
            p_endereco: formData.endereco || null,
            p_cidade: formData.cidade || null,
            p_estado: formData.estado || null,
            p_cep: formData.cep || null,
            p_plano: formData.plano || 'basico'
          });

        if (empresaError) {
          console.error('Error creating company via RPC:', empresaError);
          
          // Fallback: tentar criar empresa diretamente (pode falhar por RLS)
          const { data: empresaFallback, error: empresaFallbackError } = await supabase
            .from('empresas')
            .insert(empresaData)
            .select()
            .single();

          if (empresaFallbackError) {
            console.error('Fallback also failed:', empresaFallbackError);
            throw new Error(`Erro ao criar empresa: ${empresaError.message}`);
          }

          // Se conseguiu criar, tentar vincular ao perfil
          const { error: perfilError } = await supabase
            .from('perfis')
            .update({ id_empresa: empresaFallback.id })
            .eq('id', user.id);

          if (perfilError) {
            // Rollback: deletar empresa criada
            await supabase
              .from('empresas')
              .delete()
              .eq('id', empresaFallback.id);
            
            throw new Error(`Erro ao vincular perfil: ${perfilError.message}`);
          }
        }

        setSuccess('Empresa criada e vinculada com sucesso!');
        
        // Recarregar a página para atualizar o contexto
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || 'Erro inesperado ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando configurações da empresa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Building className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {empresa ? 'Configurações da Empresa' : 'Cadastrar Empresa'}
          </h1>
          <p className="text-gray-600">
            {empresa ? 'Gerencie os dados da sua empresa' : 'Cadastre sua empresa para acessar todas as funcionalidades'}
          </p>
        </div>
      </div>

      {/* Status da Empresa */}
      <div className={`rounded-xl shadow-sm border p-6 ${
        empresa 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-3">
          {empresa ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          )}
          <div>
            <h3 className={`font-semibold ${
              empresa ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {empresa ? 'Empresa Cadastrada' : 'Empresa Não Cadastrada'}
            </h3>
            <p className={`text-sm ${
              empresa ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {empresa 
                ? `Empresa "${empresa.nome}" está ativa e vinculada ao seu perfil`
                : 'Cadastre sua empresa para acessar todas as funcionalidades do sistema'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Empresa *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="nome"
                  name="nome"
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da sua empresa"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ
              </label>
              <input
                id="cnpj"
                name="cnpj"
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label htmlFor="plano" className="block text-sm font-medium text-gray-700 mb-2">
                Plano
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="plano"
                  name="plano"
                  value={formData.plano}
                  onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="basico">Básico - Gratuito</option>
                  <option value="premium">Premium - R$ 49,90/mês</option>
                  <option value="enterprise">Enterprise - R$ 99,90/mês</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email da Empresa
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-2">
                CEP
              </label>
              <input
                id="cep"
                name="cep"
                type="text"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00000-000"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-2">
                Endereço Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-2">
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sua cidade"
              />
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Informações sobre os Planos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">💼 Informações dos Planos</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2">Básico - Gratuito</h5>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Até 100 transações/mês</li>
                  <li>• 1 usuário</li>
                  <li>• Relatórios básicos</li>
                  <li>• Suporte por email</li>
                </ul>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2">Premium - R$ 49,90/mês</h5>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Transações ilimitadas</li>
                  <li>• Até 5 usuários</li>
                  <li>• Relatórios avançados</li>
                  <li>• Chat IA integrado</li>
                  <li>• Suporte prioritário</li>
                </ul>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <h5 className="font-semibold text-blue-900 mb-2">Enterprise - R$ 99,90/mês</h5>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Tudo do Premium</li>
                  <li>• Usuários ilimitados</li>
                  <li>• API personalizada</li>
                  <li>• Integração WhatsApp</li>
                  <li>• Suporte 24/7</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Informações Importantes */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Informações importantes:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Apenas o nome da empresa é obrigatório</li>
                  <li>• Você pode atualizar essas informações a qualquer momento</li>
                  <li>• O plano pode ser alterado conforme sua necessidade</li>
                  <li>• Todos os dados são protegidos e seguros</li>
                  {!empresa && (
                    <li>• Após cadastrar a empresa, você terá acesso completo ao sistema</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !formData.nome.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>{empresa ? 'Atualizando...' : 'Criando empresa...'}</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>{empresa ? 'Atualizar Empresa' : 'Cadastrar Empresa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Informações da Empresa (se existir) */}
      {empresa && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600">ID da Empresa</label>
              <p className="text-gray-900 font-mono">{empresa.id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">ID Sequencial</label>
              <p className="text-gray-900">#{empresa.id_sequencial}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Criada em</label>
              <p className="text-gray-900">
                {new Date(empresa.criado_em).toLocaleDateString('pt-BR')} às {new Date(empresa.criado_em).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Última atualização</label>
              <p className="text-gray-900">
                {new Date(empresa.atualizado_em).toLocaleDateString('pt-BR')} às {new Date(empresa.atualizado_em).toLocaleTimeString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Status</label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                empresa.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {empresa.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {empresa.assinatura_id && (
              <div>
                <label className="block text-xs font-medium text-gray-600">ID da Assinatura</label>
                <p className="text-gray-900 font-mono">{empresa.assinatura_id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção de Planos e Assinatura */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <CreditCard className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Planos e Assinatura</h3>
            <p className="text-gray-600">Gerencie sua assinatura e upgrade de plano</p>
          </div>
        </div>

        {/* Status do Plano Atual */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">Plano Atual</h4>
              <p className="text-purple-700 capitalize font-medium">
                {empresa?.plano || 'Básico'} 
                {empresa?.plano === 'basico' && ' - Gratuito'}
                {empresa?.plano === 'premium' && ' - R$ 49,90/mês'}
                {empresa?.plano === 'enterprise' && ' - R$ 99,90/mês'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              empresa?.plano === 'enterprise' ? 'bg-purple-100 text-purple-700' :
              empresa?.plano === 'premium' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {empresa?.plano === 'enterprise' ? '🚀 Enterprise' :
               empresa?.plano === 'premium' ? '⭐ Premium' :
               '🆓 Básico'}
            </div>
          </div>
        </div>

        {/* Botões de Assinatura */}
        <div className="space-y-4">
          {empresa?.plano === 'basico' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://sandbox.asaas.com/c/9p35djzc5y3w18tk"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <span className="text-lg">Upgrade para Premium</span>
                </div>
                <div className="text-sm opacity-90">
                  R$ 49,90/mês • Transações ilimitadas • Chat IA
                </div>
              </a>

              <a
                href="https://sandbox.asaas.com/c/52etrpbztyd8msz9"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-lg">Upgrade para Enterprise</span>
                </div>
                <div className="text-sm opacity-90">
                  R$ 99,90/mês • Usuários ilimitados • WhatsApp
                </div>
              </a>
            </div>
          )}

          {empresa?.plano === 'premium' && (
            <div className="grid grid-cols-1 gap-4">
              <a
                href="https://sandbox.asaas.com/c/52etrpbztyd8msz9"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-lg">Upgrade para Enterprise</span>
                </div>
                <div className="text-sm opacity-90">
                  R$ 99,90/mês • Usuários ilimitados • API • WhatsApp
                </div>
              </a>

              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✅ Você já tem o plano Premium ativo!</p>
                <p className="text-sm text-green-700 mt-1">Aproveite todas as funcionalidades disponíveis</p>
              </div>
            </div>
          )}

          {empresa?.plano === 'enterprise' && (
            <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="text-3xl">🎉</span>
                <h4 className="text-xl font-bold text-purple-900">Plano Enterprise Ativo!</h4>
              </div>
              <p className="text-purple-700 font-medium mb-2">
                Você tem acesso a todas as funcionalidades premium do sistema
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="font-semibold text-purple-900">✨ Usuários Ilimitados</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="font-semibold text-purple-900">🤖 Chat IA Avançado</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="font-semibold text-purple-900">📱 WhatsApp Bot</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <span className="font-semibold text-purple-900">🔗 API Personalizada</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações sobre Teste */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Ambiente de Teste</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>• Este é um ambiente de teste para validação do sistema de pagamentos</p>
                <p>• Nenhuma cobrança real será efetuada</p>
                <p>• Use dados fictícios para testar o fluxo de assinatura</p>
                <p>• O sistema irá simular o processo completo de upgrade</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;