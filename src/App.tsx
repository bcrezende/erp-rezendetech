import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { useRouter } from './hooks/useRouter';
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
import BusinessForecastPanel from './components/Dashboard/BusinessForecastPanel';
import UserSettings from './components/Settings/UserSettings';
import RemindersManager from './components/Reminders/RemindersManager';
import PendingAccountsPanel from './components/Dashboard/PendingAccountsPanel';
import PendingRemindersPanel from './components/Dashboard/PendingRemindersPanel';
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
  Menu,
  ShoppingCart
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, profile, loading, signOut, supabase } = useAuth();
  const { state } = useAppContext();
  const { isMobile, isTablet, isDesktop, isPWA, hasTouch, orientation } = useDeviceDetection();
  const { currentComponent, navigate, navigateByComponent, getCurrentRoute } = useRouter();

  // Get current route info
  const currentRoute = getCurrentRoute();
  const isResetPasswordPage = currentComponent === 'reset-password';
  const isAuthPage = currentComponent === 'auth';

  // Update document title based on current route
  React.useEffect(() => {
    if (currentRoute?.title) {
      document.title = currentRoute.title;
    }
  }, [currentRoute]);

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
    navigate('/auth');
  };

  // If on reset password page or auth page, show appropriate form regardless of auth state
  if (isResetPasswordPage) {
    return <ResetPasswordForm />;
  }

  if (isAuthPage) {
    return <LoginForm />;
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

  // Check if user needs company setup (except for settings pages)
  const needsCompanySetup = !profile?.id_empresa && 
    currentRoute?.requiresCompany && 
    currentComponent !== 'company-settings';

  if (needsCompanySetup) {
    navigate('/configuracoes-empresa');
    return null;
  }

  // User authenticated with profile - show main app
  const renderPageContent = () => {
    switch (currentComponent) {
      case 'dashboard':
        return (
          <div className="space-y-6 lg:space-y-8">
            {/* Filtro Global de Data */}
            <div className="card-modern rounded-xl lg:rounded-2xl shadow-xl border border-white/20 p-4 lg:p-6 hover-lift animate-slide-in-up">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-2xl" />
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-3 w-full lg:w-auto">
                  <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm lg:text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Filtro de Período</h3>
                    <p className="text-xs lg:text-sm text-gray-600 font-medium">Selecione o período para análise</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">De:</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">Até:</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={() => { setDateFilter(getInitialMonthDateRange());
                    }}
                    className="px-4 py-2 lg:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm w-full sm:w-auto whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                  >
                    Mês Atual
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              <div className="animate-slide-in-left stagger-1">
                <DREPanel dateFilter={dateFilter} />
              </div>
              <div className="animate-slide-in-right stagger-2">
                <CashFlowPanel />
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              <div className="animate-slide-in-up stagger-3">
                <PendingAccountsPanel dateFilter={dateFilter} />
              </div>
              <div className="animate-slide-in-up stagger-4">
                <PendingRemindersPanel dateFilter={dateFilter} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              <div className="animate-slide-in-up stagger-5">
                <BusinessForecastPanel dateFilter={dateFilter} />
              </div>
              <div className="animate-slide-in-up stagger-6">
                <EstimatePanel dateFilter={dateFilter} />
              </div>
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
      
      case 'purchases':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center py-12">
              <div className="mb-4">
                <ShoppingCart size={48} className="mx-auto text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Módulo de Compras em Desenvolvimento
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Esta funcionalidade será implementada em breve.
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Em breve você poderá gerenciar pedidos de compra e controle de fornecedores.
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'reports':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center py-12">
              <div className="mb-4">
                <BarChart3 size={48} className="mx-auto text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Módulo de Relatórios em Desenvolvimento
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Esta funcionalidade será implementada em breve.
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Em breve você terá acesso a relatórios avançados e análises detalhadas.
                </p>
              </div>
            </div>
          </div>
        );
      
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

  const { title, subtitle } = currentRoute || { title: 'Sistema ERP', subtitle: 'Gestão empresarial completa' };

  // Adicionar classes CSS baseadas no dispositivo
  const deviceClasses = [
    isMobile && 'device-mobile',
    isTablet && 'device-tablet', 
    isDesktop && 'device-desktop',
    isPWA && 'device-pwa',
    hasTouch && 'device-touch',
    orientation === 'landscape' && 'device-landscape'
  ].filter(Boolean).join(' ');

  return (
    <div className={`flex h-screen ${
      state.theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-dashboard animate-gradient-shift'
    } safe-top safe-bottom ${deviceClasses} ${isMobileSidebarOpen ? 'overflow-hidden' : ''}`}>
      <Sidebar 
        currentPage={currentComponent} 
        onNavigate={navigateByComponent} 
        profile={profile || {}} 
        mobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        deviceInfo={{ isMobile, isTablet, isDesktop, isPWA, hasTouch }}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`${
          state.theme === 'dark' 
            ? 'bg-gray-800/95 backdrop-blur-xl border-gray-700' 
            : 'glass-strong border-white/30'
        } shadow-2xl border-b relative overflow-hidden ${
          isMobile ? 'px-3 py-4' : 'px-6 py-6'
        }`}>
          {/* Header gradient overlay */}
          <div className={`absolute inset-0 ${
            state.theme === 'dark'
              ? 'bg-gradient-to-r from-gray-700/3 via-gray-600/3 to-gray-700/3'
              : 'bg-gradient-to-r from-gray-200/5 via-gray-300/5 to-gray-200/5'
          }`} />
          
          {/* Floating particles effect */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className={`absolute top-4 left-10 w-2 h-2 rounded-full animate-float ${
              state.theme === 'dark' ? 'bg-gray-500/15' : 'bg-gray-400/20'
            }`} style={{ animationDelay: '0s' }}></div>
            <div className={`absolute top-8 right-20 w-1 h-1 rounded-full animate-float ${
              state.theme === 'dark' ? 'bg-gray-500/15' : 'bg-gray-400/20'
            }`} style={{ animationDelay: '2s' }}></div>
            <div className={`absolute bottom-6 left-1/3 w-1.5 h-1.5 rounded-full animate-float ${
              state.theme === 'dark' ? 'bg-gray-500/15' : 'bg-gray-400/20'
            }`} style={{ animationDelay: '4s' }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className={`p-3 rounded-xl transition-smooth backdrop-blur-sm hover-glow touch-target ${
                    state.theme === 'dark' ? 'hover:bg-gray-700/60' : 'hover:bg-white/60'
                  }`}
                >
                  <Menu size={20} className={state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              )}
              
              <div className="relative z-10">
                <h2 className={`font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent tracking-tight animate-slide-in-from-left ${
                  state.theme === 'dark' ? 'from-white to-gray-200' : 'from-gray-900 to-gray-700'
                } ${
                  isMobile ? 'text-lg' : 'text-3xl'
                }`}>
                  {title}
                </h2>
                {subtitle && (
                  <p className={`font-semibold tracking-wide animate-slide-in-from-left stagger-1 ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } ${
                    isMobile ? 'text-xs mt-1' : 'text-sm mt-2'
                  }`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 relative z-10">
              {!isMobile && (
                <div className={`text-right rounded-xl px-4 py-3 hover-lift animate-slide-in-from-right ${
                  state.theme === 'dark' 
                    ? 'bg-gray-700/80 backdrop-blur-xl border border-gray-600' 
                    : 'glass'
                }`}>
                  <p className={`text-sm font-bold tracking-wide ${
                    state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>{profile?.nome_completo}</p>
                  <p className={`text-xs font-medium mt-1 ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>{profile?.empresas?.nome}</p>
                </div>
              )}
              
              {/* Mobile User Avatar */}
              {isMobile && (
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center shadow-lg animate-scale-in touch-target">
                  <span className="text-white text-sm font-bold">
                    {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              
              <button
                onClick={handleSignOut}
                className={`p-3 hover:text-gray-700 rounded-xl transition-smooth backdrop-blur-sm animate-slide-in-from-right stagger-1 touch-target ${
                  state.theme === 'dark' 
                    ? 'text-gray-300 hover:bg-gray-700/60' 
                    : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <main className={`flex-1 overflow-y-auto animate-fade-in custom-scrollbar mobile-scroll ${
          state.theme === 'dark' ? 'bg-gray-900' : ''
        } ${
          isMobile ? 'p-3' : 'p-6 lg:p-8'
        }`}>
          <div className="min-h-full">
            {renderPageContent()}
          </div>
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