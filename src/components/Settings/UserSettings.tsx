import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { 
  User, 
  Building, 
  CreditCard, 
  Shield, 
  Bell, 
  Save, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Crown,
  Zap,
  Star,
  BarChart3
} from 'lucide-react';
import { Database } from '../../types/supabase';

type DREConfig = Database['public']['Tables']['configuracoes_dre']['Row'];

const UserSettings: React.FC = () => {
  const { profile, supabase, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [dreConfig, setDreConfig] = useState<Partial<DREConfig>>({
    percentual_deducao_receita: 10.00,
    percentual_imposto_lucro: 15.00,
    percentual_custos_vendas: 60.00,
    percentual_despesas_operacionais: 30.00,
    percentual_resultado_financeiro: 2.00
  });

  // Profile form data
  const [profileData, setProfileData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    assinatura_id: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Company form data
  const [companyData, setCompanyData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    plano: 'basico'
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_transacoes: true,
    email_relatorios: true,
    email_vencimentos: true,
    push_notifications: true
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        nome_completo: profile.nome_completo || '',
        email: profile.empresas?.email || '',
        telefone: profile.telefone || '',
        assinatura_id: profile.assinatura_id || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setCompanyData({
        nome: profile.empresas?.nome || '',
        cnpj: profile.empresas?.cnpj || '',
        email: profile.empresas?.email || '',
        telefone: profile.empresas?.telefone || '',
        endereco: profile.empresas?.endereco || '',
        plano: profile.empresas?.plano || 'basico'
      });
    }

    loadDREConfig();
    loadSubscriptionInfo();
  }, [profile]);

  const loadSubscriptionInfo = async () => {
    if (!profile?.assinatura_id) {
      setSubscriptionInfo(null);
      return;
    }

    setLoadingSubscription(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-subscription-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assinatura_id: profile.assinatura_id
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.warn('Subscription service unavailable:', data);
        setSubscriptionInfo({ 
          error: 'Serviço de assinatura indisponível',
          details: 'As informações da assinatura não puderam ser carregadas no momento. Tente novamente mais tarde.'
        });
        return;
      }
      
      setSubscriptionInfo(data);
    } catch (error) {
      console.warn('Error loading subscription info:', error);
      setSubscriptionInfo({ 
        error: 'Serviço temporariamente indisponível',
        details: 'Não foi possível carregar as informações da assinatura. Tente novamente mais tarde.'
      });
    } finally {
      setLoadingSubscription(false);
    }
  };
  const loadDREConfig = async () => {
    if (!profile?.id_empresa) return;

    try {
      const { data, error } = await supabase
        .from('configuracoes_dre')
        .select('*')
        .eq('ativo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setDreConfig({
          percentual_deducao_receita: data.percentual_deducao_receita,
          percentual_imposto_lucro: data.percentual_imposto_lucro,
          percentual_custos_vendas: data.percentual_custos_vendas,
          percentual_despesas_operacionais: data.percentual_despesas_operacionais,
          percentual_resultado_financeiro: data.percentual_resultado_financeiro
        });
      }
    } catch (error) {
      console.error('Error loading DRE config:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('perfis')
        .update({ 
          nome_completo: profileData.nome_completo,
          telefone: profileData.telefone || null,
          assinatura_id: profileData.assinatura_id || null
        })
        .eq('id', profile?.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          throw new Error('As senhas não coincidem');
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: profileData.newPassword
        });

        if (passwordError) throw passwordError;
      }

      showMessage('success', 'Perfil atualizado com sucesso!');
      setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      
      // Recarregar informações da assinatura se o ID foi alterado
      if (profileData.assinatura_id !== profile?.assinatura_id) {
        setTimeout(() => {
          loadSubscriptionInfo();
        }, 1000);
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id_empresa) {
      showMessage('error', 'Você precisa criar uma empresa primeiro. Vá para a aba "Empresa" e preencha os dados.');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          nome: companyData.nome,
          cnpj: companyData.cnpj,
          email: companyData.email,
          telefone: companyData.telefone,
          endereco: companyData.endereco,
          plano: companyData.plano
        })
        .eq('id', profile?.id_empresa);

      if (error) throw error;

      showMessage('success', 'Dados da empresa atualizados com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (newPlan: string) => {
    if (newPlan === companyData.plano) return;

    if (!profile?.id_empresa) {
      showMessage('error', 'Você precisa criar uma empresa primeiro antes de alterar o plano.');
      return;
    }

    // Para planos pagos, redirecionar para página de pagamento
    if (newPlan === 'premium' || newPlan === 'enterprise') {
      const confirmRedirect = confirm(
        `Você será redirecionado para a página de pagamento para adquirir o plano ${newPlan.toUpperCase()}. Deseja continuar?`
      );
      
      if (confirmRedirect) {
        window.open('https://sandbox.asaas.com/c/52etrpbztyd8msz9', '_blank');
      }
      return;
    }

    // Para plano básico (gratuito), atualizar diretamente
    if (newPlan === 'basico') {
      const planConfirmation = confirm(
        'Deseja alterar seu plano para BÁSICO? Você perderá acesso às funcionalidades premium.'
      );

      if (!planConfirmation) return;

      setLoading(true);

      try {
        const { error } = await supabase
          .from('empresas')
          .update({ plano: newPlan })
          .eq('id', profile?.id_empresa);

        if (error) throw error;

        setCompanyData(prev => ({ ...prev, plano: newPlan }));
        showMessage('success', 'Plano alterado para BÁSICO com sucesso!');
      } catch (error: any) {
        showMessage('error', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDREConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id_empresa) {
      showMessage('error', 'Você precisa criar uma empresa primeiro antes de configurar o DRE.');
      return;
    }

    setLoading(true);

    try {
      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('configuracoes_dre')
        .select('id')
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .maybeSingle();

      if (existingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('configuracoes_dre')
          .update({
            percentual_deducao_receita: dreConfig.percentual_deducao_receita,
            percentual_imposto_lucro: dreConfig.percentual_imposto_lucro,
            percentual_custos_vendas: dreConfig.percentual_custos_vendas,
            percentual_despesas_operacionais: dreConfig.percentual_despesas_operacionais,
            percentual_resultado_financeiro: dreConfig.percentual_resultado_financeiro
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('configuracoes_dre')
          .insert({
            id_empresa: profile.id_empresa,
            percentual_deducao_receita: dreConfig.percentual_deducao_receita,
            percentual_imposto_lucro: dreConfig.percentual_imposto_lucro,
            percentual_custos_vendas: dreConfig.percentual_custos_vendas,
            percentual_despesas_operacionais: dreConfig.percentual_despesas_operacionais,
            percentual_resultado_financeiro: dreConfig.percentual_resultado_financeiro
          });

        if (error) throw error;
      }

      showMessage('success', 'Configurações do DRE atualizadas com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'basico',
      name: 'Básico',
      price: 'Gratuito',
      icon: User,
      color: 'gray',
      features: [
        'Até 50 transações/mês',
        '1 usuário',
        'Relatórios básicos',
        'Suporte por email'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 199,90/mês',
      icon: Star,
      color: 'blue',
      features: [
        'Transações ilimitadas',
        'Até 5 usuários',
        'Relatórios avançados',
        'Agente WhatsApp IA',
        'Suporte prioritário'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 499,90/mês',
      icon: Crown,
      color: 'purple',
      features: [
        'Tudo do Premium',
        'Usuários ilimitados',
        'API personalizada',
        'Integrações avançadas',
        'Suporte 24/7'
      ]
    }
  ];

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'company', label: 'Empresa', icon: Building },
    { id: 'subscription', label: 'Assinatura', icon: CreditCard },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'dre', label: 'Configurações DRE', icon: BarChart3 },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center space-x-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informações Pessoais
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={profileData.nome_completo}
                      onChange={(e) => setProfileData(prev => ({ ...prev, nome_completo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={profileData.telefone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Para alterar o email, entre em contato com o suporte
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID da Assinatura
                    </label>
                    <input
                      type="text"
                      value={profileData.assinatura_id}
                      onChange={(e) => setProfileData(prev => ({ ...prev, assinatura_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ID da assinatura no sistema de pagamento"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ID usado para integração com n8n e webhooks de pagamento
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Alterar Senha
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Senha Atual
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <form onSubmit={handleCompanyUpdate} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dados da Empresa
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={companyData.nome}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={companyData.cnpj}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, cnpj: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email da Empresa
                  </label>
                  <input
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={companyData.telefone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, telefone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={companyData.endereco}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, endereco: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Plano Atual
                </h3>
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`p-2 rounded-lg ${
                    companyData.plano === 'basico' ? 'bg-gray-100' :
                    companyData.plano === 'premium' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {companyData.plano === 'basico' ? <User size={20} /> :
                     companyData.plano === 'premium' ? <Star size={20} /> : <Crown size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">
                      Plano {companyData.plano}
                    </p>
                    <p className="text-sm text-gray-500">
                      {plans.find(p => p.id === companyData.plano)?.price}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Escolha seu Plano
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative p-6 rounded-xl border-2 transition-all ${
                        companyData.plano === plan.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {companyData.plano === plan.id && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                            Plano Atual
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <div className={`inline-flex p-3 rounded-full mb-3 ${
                          plan.color === 'gray' ? 'bg-gray-100' :
                          plan.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          <plan.icon size={24} className={
                            plan.color === 'gray' ? 'text-gray-600' :
                            plan.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                          } />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{plan.price}</p>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <CheckCircle size={16} className="text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {companyData.plano !== plan.id && (
                        <button
                          onClick={() => handlePlanChange(plan.id)}
                          disabled={loading}
                          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                            plan.color === 'gray' 
                              ? 'bg-gray-600 hover:bg-gray-700 text-white' :
                            plan.color === 'blue' 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' : 
                              'bg-purple-600 hover:bg-purple-700 text-white'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loading ? 'Processando...' : 
                           plan.id === 'basico' ? 'Alterar para Básico' : 'Adquirir Plano'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Info Section */}
              {profile?.assinatura_id && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Informações da Assinatura
                  </h3>
                  
                  {loadingSubscription ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
                      <p className="text-gray-600">Carregando informações da assinatura...</p>
                    </div>
                  ) : subscriptionInfo?.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-700">{subscriptionInfo.error}</p>
                          {subscriptionInfo.details && (
                            <p className="text-xs text-red-600 mt-1">{subscriptionInfo.details}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : subscriptionInfo ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            ID da Assinatura
                          </label>
                          <p className="text-lg font-semibold text-gray-900">
                            {profile.assinatura_id}
                          </p>
                        </div>
                        
                        {subscriptionInfo.status && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Status
                            </label>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              subscriptionInfo.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                              subscriptionInfo.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                              subscriptionInfo.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {subscriptionInfo.status === 'ACTIVE' ? 'Ativa' :
                               subscriptionInfo.status === 'OVERDUE' ? 'Em Atraso' :
                               subscriptionInfo.status === 'SUSPENDED' ? 'Suspensa' :
                               subscriptionInfo.status}
                            </span>
                          </div>
                        )}
                        
                        {subscriptionInfo.nextDueDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Próximo Vencimento
                            </label>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(subscriptionInfo.nextDueDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                        
                        {subscriptionInfo.value && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Valor da Assinatura
                            </label>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(subscriptionInfo.value)}
                            </p>
                          </div>
                        )}
                        
                        {subscriptionInfo.plan && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Plano Contratado
                            </label>
                            <p className="text-lg font-semibold text-gray-900 capitalize">
                              {subscriptionInfo.plan}
                            </p>
                          </div>
                        )}
                        
                        {subscriptionInfo.createdDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Data de Contratação
                            </label>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(subscriptionInfo.createdDate).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={loadSubscriptionInfo}
                          disabled={loadingSubscription}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{loadingSubscription ? 'Atualizando...' : 'Atualizar Informações'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <p className="text-gray-600 mb-4">
                        Nenhuma informação de assinatura encontrada para o ID: {profile.assinatura_id}
                      </p>
                      <button
                        onClick={loadSubscriptionInfo}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {!profile?.empresas?.assinatura_id && (
                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        {!profile?.id_empresa ? 'Empresa não configurada' : 'ID da Assinatura não configurado'}
                      </p>
                      <p className="text-sm text-yellow-700">
                        {!profile?.id_empresa 
                          ? 'Configure os dados da empresa primeiro na aba "Empresa".'
                          : 'Configure o ID da assinatura na aba "Perfil" para ver as informações detalhadas.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DRE Configuration Tab */}
          {activeTab === 'dre' && (
            <form onSubmit={handleDREConfigUpdate} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Configurações do DRE (Demonstrativo do Resultado do Exercício)
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure os percentuais utilizados nos cálculos do DRE da sua empresa.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deduções da Receita (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={dreConfig.percentual_deducao_receita || ''}
                    onChange={(e) => setDreConfig(prev => ({ 
                      ...prev, 
                      percentual_deducao_receita: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual aplicado sobre a receita bruta (impostos sobre vendas, devoluções, etc.)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impostos sobre Lucro (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={dreConfig.percentual_imposto_lucro || ''}
                    onChange={(e) => setDreConfig(prev => ({ 
                      ...prev, 
                      percentual_imposto_lucro: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual de impostos aplicado sobre o lucro bruto (IR, CSLL, etc.)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custos das Vendas (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={dreConfig.percentual_custos_vendas || ''}
                    onChange={(e) => setDreConfig(prev => ({ 
                      ...prev, 
                      percentual_custos_vendas: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual das despesas que representam custos diretos das vendas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Despesas Operacionais (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={dreConfig.percentual_despesas_operacionais || ''}
                    onChange={(e) => setDreConfig(prev => ({ 
                      ...prev, 
                      percentual_despesas_operacionais: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual das despesas que são operacionais (administrativas, vendas, etc.)
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resultado Financeiro (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={dreConfig.percentual_resultado_financeiro || ''}
                    onChange={(e) => setDreConfig(prev => ({ 
                      ...prev, 
                      percentual_resultado_financeiro: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual da receita que representa resultado financeiro (juros recebidos, rendimentos, etc.)
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Como funciona</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <strong>Deduções:</strong> Aplicadas sobre a receita bruta para calcular a receita líquida</p>
                  <p>• <strong>Custos:</strong> Percentual das despesas considerado como custo direto das vendas</p>
                  <p>• <strong>Despesas Operacionais:</strong> Percentual das despesas considerado como despesa operacional</p>
                  <p>• <strong>Resultado Financeiro:</strong> Percentual da receita considerado como resultado financeiro</p>
                  <p>• <strong>Impostos:</strong> Aplicados sobre o lucro bruto quando positivo</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  <span>{loading ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Preferências de Notificação
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificações de Transações</h4>
                    <p className="text-sm text-gray-600">Receba emails sobre novas transações</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email_transacoes}
                      onChange={(e) => setNotifications(prev => ({ ...prev, email_transacoes: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Relatórios Mensais</h4>
                    <p className="text-sm text-gray-600">Receba relatórios financeiros mensais</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email_relatorios}
                      onChange={(e) => setNotifications(prev => ({ ...prev, email_relatorios: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Alertas de Vencimento</h4>
                    <p className="text-sm text-gray-600">Notificações sobre contas a vencer</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email_vencimentos}
                      onChange={(e) => setNotifications(prev => ({ ...prev, email_vencimentos: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Notificações Push</h4>
                    <p className="text-sm text-gray-600">Notificações no navegador</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.push_notifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, push_notifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => showMessage('success', 'Preferências de notificação salvas!')}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  <span>Salvar Preferências</span>
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configurações de Segurança
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Sessões Ativas</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Você está conectado neste dispositivo
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Navegador atual • {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      Ativo
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Zona de Perigo</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Ações irreversíveis que afetam sua conta
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (confirm('Deseja realmente sair de todas as sessões? Você precisará fazer login novamente.')) {
                          signOut();
                        }
                      }}
                      className="w-full text-left p-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <div className="font-medium text-red-900">Sair de todas as sessões</div>
                      <div className="text-sm text-red-700">Desconectar de todos os dispositivos</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;