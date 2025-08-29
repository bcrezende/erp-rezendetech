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

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, profile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['cadastros', 'financeiro']);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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
              onNavigate(item.id);
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
            {!isCollapsed && (
              <span className="font-medium">{item.label}</span>
            )}
          </div>
          {hasChildren && !isCollapsed && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}
        </button>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white shadow-xl transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    } h-full flex flex-col`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sistema ERP</h1>
              <p className="text-sm text-gray-500">Gestão Empresarial</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-medium text-gray-900">{profile?.nome_completo || 'Usuário'}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.papel || 'Usuário'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;