import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
import { AppProvider } from './contexts/AppContext';
import LoginForm from './components/Auth/LoginForm';
import ResetPasswordForm from './components/Auth/ResetPasswordForm';
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
import UserSettings from './components/Settings/UserSettings';
import RemindersManager from './components/Reminders/RemindersManager';
import PendingAccountsPanel from './components/Dashboard/PendingAccountsPanel';
import CompanySettings from './components/Settings/CompanySettings';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  BarChart3,
  LogOut,
  AlertCircle,
  Calendar,
  Menu
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, profile, loading, signOut, supabase } = useAuth();

  // Check if current URL is reset-password
  const isResetPasswordPage = window.location.pathname === '/reset-password';

  // Calculate initial date filter for the entire current month
  const getInitialMonthDateRange = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0]
    };
  };
  const [dateFilter, setDateFilter] = useState(getInitialMonthDateRange());

  const handleSignOut = async () => {
    await signOut();
  };

  // If on reset password page, show reset form regardless of auth state
  if (isResetPasswordPage) {
    return <ResetPasswordForm />;
  }

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
      settings: { title: 'Configurações do Usuário', subtitle: 'Configurações da sua conta' },
      'company-settings': { title: 'Configurações da Empresa', subtitle: 'Dados e informações da empresa' }
    };
    return titles[page] || { title: 'Sistema ERP', subtitle: 'Gestão empresarial completa' };
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Filtro Global de Data */}
            <div className="card-modern rounded-2xl shadow-xl border border-white/20 p-6 hover-lift animate-slide-in-up">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl" />
              <div className="flex items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Filtro de Período</h3>
                    <p className="text-sm text-gray-600 font-medium">Selecione o período para análise</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-sm font-semibold text-gray-700">De:</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-sm font-semibold text-gray-700">Até:</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={() => { setDateFilter(getInitialMonthDateRange());
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm w-full sm:w-auto whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                  >
                    Mês Atual
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="animate-slide-in-left stagger-1">
                <DREPanel dateFilter={dateFilter} />
              </div>
              <div className="animate-slide-in-left stagger-2">
                <CashFlowPanel />
              </div>
            </div>
            
            <div className="animate-slide-in-up stagger-3">
              <PendingAccountsPanel dateFilter={dateFilter} />
            </div>

            <div className="animate-slide-in-up stagger-4">
              <EstimatePanel dateFilter={dateFilter} />
            </div>
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
      
      case 'company-settings':
        return <CompanySettings />;
      
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
    <div className={`flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${isMobileSidebarOpen ? 'overflow-hidden' : ''}`}>
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        profile={profile || {}} 
        mobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 px-4 sm:px-6 py-4 relative">
          {/* Header gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-white/60 transition-all duration-200 md:hidden backdrop-blur-sm"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{title}</h2>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 relative z-10">
              <div className="text-right hidden sm:block bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{profile?.nome_completo}</p>
                <p className="text-xs text-gray-500">{profile?.empresas?.nome}</p>
              </div>
              
              {/* Mobile User Avatar */}
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center sm:hidden shadow-lg">
                <span className="text-white text-xs font-medium">
                  {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-white/60 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in">
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