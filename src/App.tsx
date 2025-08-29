import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
import { AppProvider } from './contexts/AppContext';
import LoginForm from './components/Auth/LoginForm';
import PeopleManager from './components/People/PeopleManager';
import ProductsManager from './components/Products/ProductsManager';
import TransactionsManager from './components/Transactions/TransactionsManager';
import AccountsPayable from './components/Financial/AccountsPayable';
import AccountsReceivable from './components/Financial/AccountsReceivable';
import FinancialIndicators from './components/Financial/FinancialIndicators';
import SalesManager from './components/Sales/SalesManager';
import CategoriesManager from './components/Categories/CategoriesManager';
import Sidebar from './components/Layout/Sidebar';
import DREPanel from './components/Dashboard/DREPanel';
import CashFlowPanel from './components/Dashboard/CashFlowPanel';
import EstimatePanel from './components/Dashboard/EstimatePanel';
import CashPositionCard from './components/Dashboard/CashPositionCard';
import MetricCard from './components/Dashboard/MetricCard';
import UserSettings from './components/Settings/UserSettings';
import RemindersManager from './components/Reminders/RemindersManager';
import CompanyRegistrationForm from './components/Company/CompanyRegistrationForm';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  BarChart3,
  LogOut,
  AlertCircle,
  Calendar
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, profile, loading, signOut, supabase } = useAuth();
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [dashboardData, setDashboardData] = useState({
    totalReceitas: 0,
    saldoLiquido: 0,
    loading: true
  });

  const handleSignOut = async () => {
    await signOut();
  };

  // Carregar dados do dashboard
  React.useEffect(() => {
    if (profile?.id_empresa) {
      loadDashboardData();
    }
  }, [profile, dateFilter]);

  const loadDashboardData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setDashboardData(prev => ({ ...prev, loading: false }));
        return;
      }

      setDashboardData(prev => ({ ...prev, loading: true }));

      // Carregar apenas transações pagas/recebidas dentro do período filtrado
      const { data: transacoes, error: transacoesError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .in('status', ['concluida', 'pago', 'recebido'])
        .gte('data_transacao', dateFilter.startDate)
        .lte('data_transacao', dateFilter.endDate);

      if (transacoesError) throw transacoesError;


      // Calcular métricas
      const receitas = transacoes?.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + t.valor, 0) || 0;
      const despesas = transacoes?.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0) || 0;
      const saldo = receitas - despesas;

      console.log('📊 Dashboard metrics calculated:', {
        receitas,
        despesas,
        saldo,
        periodo: `${dateFilter.startDate} até ${dateFilter.endDate}`,
        transacoesFiltradas: transacoes,
        totalTransacoes: transacoes?.length || 0
      });

      setDashboardData({
        totalReceitas: receitas,
        saldoLiquido: saldo,
        loading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Carregando sistema...</p>
          <p className="text-xs text-gray-400 mt-2">Verificando autenticação</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login or signup
  if (!user) {
    return <LoginForm />;
  }

  // User authenticated with profile - show main app
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getPageTitle = (page: string) => {
    const titles: Record<string, { title: string; subtitle: string }> = {
      dashboard: { title: 'Dashboard', subtitle: 'Visão geral do seu negócio' },
      transactions: { title: 'Transações', subtitle: 'Controle de receitas e despesas' },
      clients: { title: 'Clientes', subtitle: 'Gestão de relacionamento com clientes' },
      suppliers: { title: 'Fornecedores', subtitle: 'Cadastro de fornecedores' },
      products: { title: 'Produtos', subtitle: 'Catálogo de produtos e serviços' },
      sales: { title: 'Vendas', subtitle: 'Pedidos e faturamento' },
      purchases: { title: 'Compras', subtitle: 'Pedidos de compra' },
      reminders: { title: 'Lembretes', subtitle: 'Gerencie seus lembretes e notificações' },
      reports: { title: 'Relatórios', subtitle: 'Análises e indicadores' },
      'whatsapp-agent': { title: 'Agente WhatsApp', subtitle: 'Integração com inteligência artificial' },
      settings: { title: 'Configurações', subtitle: 'Configurações da conta e empresa' }
    };
    return titles[page] || { title: 'Sistema ERP', subtitle: 'Gestão empresarial completa' };
  };

  const dashboardMetrics = dashboardData.loading ? [
    {
      title: 'Receita Total',
      value: 'Carregando...',
      change: 'Aguarde',
      changeType: 'neutral' as const,
      icon: TrendingUp,
      color: 'green' as const
    },
    {
      title: 'Saldo Líquido',
      value: 'Carregando...',
      change: 'Aguarde',
      changeType: 'neutral' as const,
      icon: DollarSign,
      color: 'blue' as const
    }
  ] : [
    {
      title: 'Receita Total',
      value: formatCurrency(dashboardData.totalReceitas),
      change: dashboardData.totalReceitas > 0 ? 'Receitas registradas' : 'Nenhuma receita registrada',
      changeType: dashboardData.totalReceitas > 0 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      color: 'green' as const
    },
    {
      title: 'Saldo Líquido',
      value: formatCurrency(dashboardData.saldoLiquido),
      change: dashboardData.saldoLiquido > 0 ? 'Saldo positivo' : 
             dashboardData.saldoLiquido < 0 ? 'Saldo negativo' : 'Aguardando movimentações',
      changeType: dashboardData.saldoLiquido > 0 ? 'positive' as const : 
                  dashboardData.saldoLiquido < 0 ? 'negative' as const : 'neutral' as const,
      icon: DollarSign,
      color: dashboardData.saldoLiquido >= 0 ? 'blue' as const : 'red' as const
    }
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Filtro Global de Data */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Filtro de Período</h3>
                    <p className="text-sm text-gray-600">Selecione o período para análise</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">De:</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Até:</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Mês Atual
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardMetrics.map((metric, index) => (
                <MetricCard
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  change={metric.change}
                  changeType={metric.changeType}
                  icon={metric.icon}
                  color={metric.color}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DREPanel dateFilter={dateFilter} />
              <CashFlowPanel dateFilter={dateFilter} />
              <CashPositionCard dateFilter={dateFilter} />
            </div>

            <EstimatePanel dateFilter={dateFilter} />
          </div>
        );
      
      case 'transactions':
        return <TransactionsManager />;
      
      case 'accounts-payable':
        return <AccountsPayable />;
      
      case 'accounts-receivable':
        return <AccountsReceivable />;
      
      case 'financial-indicators':
        return <FinancialIndicators />;
      
      case 'people':
        return <PeopleManager />;
      
      case 'products':
        return <ProductsManager />;
      
      case 'categories':
        return <CategoriesManager />;
      
      case 'sales':
        return <SalesManager />;
      
      case 'reminders':
        return <RemindersManager />;
      
      case 'settings':
        return <UserSettings />;
      
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <div className="mb-4">
                <BarChart3 size={48} className="mx-auto text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Página em Desenvolvimento
              </h3>
              <p className="text-gray-600">
                Esta funcionalidade será implementada em breve.
              </p>
            </div>
          </div>
        );
    }
  };

  const { title, subtitle } = getPageTitle(currentPage);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} profile={profile || {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.nome_completo}</p>
                <p className="text-xs text-gray-500">{profile?.empresas?.nome}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;