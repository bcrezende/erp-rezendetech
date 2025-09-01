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
  Calendar,
  Menu
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, profile, loading, signOut, supabase } = useAuth();

  // Calculate initial date filter for the entire current month
  const getInitialMonthDateRange = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Day 0 of next month is last day of current month

    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: lastDayOfMonth.toISOString().split('T')[0]
    };
  };
  const [dateFilter, setDateFilter] = useState(getInitialMonthDateRange());

  const handleSignOut = async () => {
    await signOut();
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

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Filtro Global de Data */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Filtro de Período</h3>
                    <p className="text-sm text-gray-600">Selecione o período para análise</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-sm font-medium text-gray-700">De:</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <label className="text-sm font-medium text-gray-700">Até:</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
                    />
                  </div>
                  <button
                    onClick={() => { setDateFilter(getInitialMonthDateRange());
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm w-full sm:w-auto whitespace-nowrap"
                  >
                    Mês Atual
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DREPanel dateFilter={dateFilter} />
              <CashFlowPanel />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PendingAccountsPanel dateFilter={dateFilter} />
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
    <div className={`flex h-screen bg-gray-50 ${isMobileSidebarOpen ? 'overflow-hidden' : ''}`}>
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        profile={profile || {}} 
        mobileOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{profile?.nome_completo}</p>
                <p className="text-xs text-gray-500">{profile?.empresas?.nome}</p>
              </div>
              
              {/* Mobile User Avatar */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center sm:hidden">
                <span className="text-white text-xs font-medium">
                  {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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