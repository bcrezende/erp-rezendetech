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
  Bell
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
  { id: 'settings', label: 'Configurações', icon: Settings }
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
          className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 ${
            isActive 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          } ${level > 0 ? 'ml-4 pl-8' : ''}`}
        >
          <div className="flex items-center space-x-3">
            <item.icon size={20} />
            {(!isDesktopCollapsed || mobileOpen) && (
              <span className="font-medium">{item.label}</span>
            )}
          </div>
          {hasChildren && (!isDesktopCollapsed || mobileOpen) && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </button>

        {hasChildren && isExpanded && (!isDesktopCollapsed || mobileOpen) && (
          <div className="mt-1 space-y-1">
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
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto md:shadow-xl
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'}
        h-full flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {(!isDesktopCollapsed || mobileOpen) && (
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Sistema ERP</h1>
                <p className="text-xs sm:text-sm text-gray-500">Gestão Empresarial</p>
              </div>
            )}
            
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
            >
              <X size={20} />
            </button>
            
            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden md:block"
            >
              {isDesktopCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* User Info */}
        <div className="p-3 sm:p-4 border-t border-gray-200">
          <div className={`flex items-center ${isDesktopCollapsed && !mobileOpen ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>
            {(!isDesktopCollapsed || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.nome_completo || 'Usuário'}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{profile?.papel || 'Usuário'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;