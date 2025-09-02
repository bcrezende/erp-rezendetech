import React, { useState } from 'react';
import { 
  Home, 
  DollarSign, 
  Users, 
  Package, 
  TruckIcon, 
  ShoppingCart, 
  BarChart3, 
  MessageCircle,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Banknote,
  AlertTriangle,
  Tag,
  Bot,
  Bell,
  User,
  Building
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  profile?: any;
  mobileOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    children: [
      { id: 'accounts-payable', label: 'Contas a Pagar', icon: CreditCard },
      { id: 'accounts-receivable', label: 'Contas a Receber', icon: Banknote },
      { id: 'financial-indicators', label: 'Indicadores', icon: AlertTriangle },
    ]
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Users,
    children: [
      { id: 'people', label: 'Pessoas', icon: Users },
      { id: 'products', label: 'Produtos', icon: Package },
      { id: 'categories', label: 'Categorias', icon: Tag },
    ]
  },
  { id: 'sales', label: 'Vendas', icon: ShoppingCart },
  { id: 'purchases', label: 'Compras', icon: TruckIcon },
  { id: 'reminders', label: 'Lembretes', icon: Bell },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    children: [
      { id: 'settings', label: 'Usuário', icon: User },
      { id: 'company-settings', label: 'Empresa', icon: Building },
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, profile, mobileOpen, onClose }) => {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['cadastros', 'financeiro']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    // Close mobile sidebar after navigation
    onClose();
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isActive = currentPage === item.id;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigate(item.id);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${
            isActive 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl animate-glow' 
              : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 backdrop-blur-sm'
          } ${level > 0 ? 'ml-4 pl-8' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <item.icon size={20} className="drop-shadow-sm" />
            {(!isDesktopCollapsed || mobileOpen) && (
              <span className="font-bold tracking-wide">{item.label}</span>
            )}
          </div>
          {hasChildren && (!isDesktopCollapsed || mobileOpen) && (
            <div className="transition-transform duration-300">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          )}
        </button>

        {hasChildren && isExpanded && (!isDesktopCollapsed || mobileOpen) && (
          <div className="mt-2 space-y-2 animate-slide-in-up">
            {item.children.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 glass-strong shadow-2xl transform transition-all duration-500 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:shadow-xl
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
        h-full flex flex-col border-r border-white/30 backdrop-blur-xl
      `}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/30 bg-gradient-to-r from-white/20 to-transparent">
          <div className="flex items-center justify-between">
            {(!isDesktopCollapsed || mobileOpen) && (
              <div className="animate-slide-in-from-left">
                <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent tracking-tight">Sistema ERP</h1>
                <p className="text-xs sm:text-sm text-gray-600 font-bold tracking-wide">Gestão Empresarial</p>
              </div>
            )}
            
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-white/60 transition-smooth md:hidden hover-glow"
            >
              <X size={20} />
            </button>
            
            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="p-3 rounded-xl hover:bg-white/60 transition-smooth hidden md:block hover-glow"
            >
              {isDesktopCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* User Info */}
        <div className="p-4 sm:p-6 border-t border-white/30 bg-gradient-to-r from-white/20 to-transparent">
          <div className={`flex items-center ${isDesktopCollapsed && !mobileOpen ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-xl hover-glow animate-scale-in">
              <span className="text-white text-sm font-bold">
                {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>
            {(!isDesktopCollapsed || mobileOpen) && (
              <div className="min-w-0 flex-1 animate-slide-in-from-left">
                <p className="text-sm font-bold text-gray-900 truncate tracking-wide">{profile?.nome_completo || 'Usuário'}</p>
                <p className="text-xs text-gray-600 capitalize truncate font-semibold">{profile?.papel || 'Usuário'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;