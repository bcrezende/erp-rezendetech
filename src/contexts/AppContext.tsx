import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { useAuth } from '../components/Auth/AuthProvider';
import { Database } from '../types/supabase';
import { 
  User, 
  Client, 
  Supplier, 
  Product, 
  Account, 
  Transaction, 
  SaleOrder, 
  PurchaseOrder,
  WhatsAppMessage 
} from '../types';

type Notificacao = Database['public']['Tables']['notificacoes']['Row'];

interface AppState {
  user: User | null;
  clients: Client[];
  suppliers: Supplier[];
  products: Product[];
  accounts: Account[];
  transactions: Transaction[];
  saleOrders: SaleOrder[];
  purchaseOrders: PurchaseOrder[];
  whatsappMessages: WhatsAppMessage[];
  notifications: Notificacao[];
  theme: 'light' | 'dark';
  loading: boolean;
  error: string | null;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_SALE_ORDER'; payload: SaleOrder }
  | { type: 'ADD_PURCHASE_ORDER'; payload: PurchaseOrder }
  | { type: 'ADD_WHATSAPP_MESSAGE'; payload: WhatsAppMessage }
  | { type: 'ADD_NOTIFICATION'; payload: Notificacao }
  | { type: 'MARK_NOTIFICATION_AS_READ'; payload: string }
  | { type: 'SET_NOTIFICATIONS'; payload: Notificacao[] }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INITIALIZE_DATA' };

const initialState: AppState = {
  user: null,
  clients: [],
  suppliers: [],
  products: [],
  accounts: [],
  transactions: [],
  saleOrders: [],
  purchaseOrders: [],
  whatsappMessages: [],
  notifications: [],
  theme: 'light',
  loading: false,
  error: null
};

// Sample data for demonstration
const sampleData = {
  user: {
    id: '1',
    name: 'João Silva',
    email: 'joao@empresa.com',
    role: 'admin' as const
  },
  clients: [
    {
      id: '1',
      name: 'Empresa ABC Ltda',
      email: 'contato@abc.com',
      phone: '(11) 99999-9999',
      document: '12.345.678/0001-90',
      address: 'Rua das Flores, 123 - São Paulo, SP',
      createdAt: new Date('2025-01-01')
    },
    {
      id: '2',
      name: 'Comercial XYZ',
      email: 'vendas@xyz.com',
      phone: '(11) 88888-8888',
      document: '98.765.432/0001-10',
      address: 'Av. Principal, 456 - Rio de Janeiro, RJ',
      createdAt: new Date('2025-01-02')
    }
  ],
  suppliers: [
    {
      id: '1',
      name: 'Fornecedor Alpha',
      email: 'compras@alpha.com',
      phone: '(11) 77777-7777',
      document: '11.222.333/0001-44',
      address: 'Rua Industrial, 789 - São Paulo, SP',
      createdAt: new Date('2025-01-01')
    }
  ],
  products: [
    {
      id: '1',
      name: 'Produto Premium A',
      description: 'Produto de alta qualidade para clientes exigentes',
      price: 299.99,
      stock: 150,
      category: 'Premium',
      createdAt: new Date('2025-01-01')
    },
    {
      id: '2',
      name: 'Serviço Consultoria',
      description: 'Consultoria especializada em gestão empresarial',
      price: 1200.00,
      stock: 0,
      category: 'Serviços',
      createdAt: new Date('2025-01-02')
    }
  ],
  accounts: [
    {
      id: '1',
      name: 'Conta Corrente Principal',
      bank: 'Banco do Brasil',
      agency: '1234-5',
      accountNumber: '67890-1',
      balance: 45750.30,
      createdAt: new Date('2025-01-01')
    },
    {
      id: '2',
      name: 'Conta Poupança',
      bank: 'Caixa Econômica',
      agency: '9876-5',
      accountNumber: '12345-6',
      balance: 25000.00,
      createdAt: new Date('2025-01-01')
    }
  ],
  transactions: [
    {
      id: '1',
      type: 'income' as const,
      category: 'Vendas',
      description: 'Venda de produtos para Empresa ABC',
      amount: 15000.00,
      date: new Date('2025-01-15'),
      accountId: '1',
      clientId: '1',
      status: 'completed' as const,
      createdAt: new Date('2025-01-15')
    },
    {
      id: '2',
      type: 'expense' as const,
      category: 'Fornecedores',
      description: 'Compra de materiais',
      amount: 5500.00,
      date: new Date('2025-01-14'),
      accountId: '1',
      supplierId: '1',
      status: 'completed' as const,
      createdAt: new Date('2025-01-14')
    },
    {
      id: '3',
      type: 'expense' as const,
      category: 'Administrativo',
      description: 'Material de escritório',
      amount: 350.00,
      date: new Date('2025-01-13'),
      accountId: '1',
      status: 'completed' as const,
      createdAt: new Date('2025-01-13')
    },
    {
      id: '4',
      type: 'income' as const,
      category: 'Serviços',
      description: 'Consultoria empresarial',
      amount: 8200.00,
      date: new Date('2025-01-12'),
      accountId: '1',
      clientId: '2',
      status: 'completed' as const,
      createdAt: new Date('2025-01-12')
    },
    {
      id: '5',
      type: 'expense' as const,
      category: 'Operacional',
      description: 'Energia elétrica',
      amount: 890.50,
      date: new Date('2025-01-10'),
      accountId: '1',
      status: 'completed' as const,
      createdAt: new Date('2025-01-10')
    },
    {
      id: '6',
      type: 'income' as const,
      category: 'Vendas',
      description: 'Venda online produtos',
      amount: 3400.00,
      date: new Date('2025-01-09'),
      accountId: '1',
      status: 'completed' as const,
      createdAt: new Date('2025-01-09')
    }
  ]
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'ADD_SALE_ORDER':
      return { ...state, saleOrders: [...state.saleOrders, action.payload] };
    case 'ADD_PURCHASE_ORDER':
      return { ...state, purchaseOrders: [...state.purchaseOrders, action.payload] };
    case 'ADD_WHATSAPP_MESSAGE':
      return { ...state, whatsappMessages: [...state.whatsappMessages, action.payload] };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_AS_READ':
      return { 
        ...state, 
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, lida: true } : n
        ) 
      };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_AS_READ':
      return { 
        ...state, 
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, lida: true } : n
        ) 
      };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'INITIALIZE_DATA':
      return {
        ...state,
        user: sampleData.user,
        clients: sampleData.clients,
        suppliers: sampleData.suppliers,
        products: sampleData.products,
        accounts: sampleData.accounts,
        transactions: sampleData.transactions
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  toggleTheme: () => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { supabase, profile, user } = useAuth();

  React.useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    dispatch({ type: 'SET_THEME', payload: initialTheme });
    
    dispatch({ type: 'INITIALIZE_DATA' });
  }, []);

  // Setup notifications realtime subscription
  React.useEffect(() => {
    // Notifications functionality disabled - table 'notificacoes' does not exist
    // To enable notifications, first create the 'notificacoes' table in Supabase
    console.log('Notifications functionality is disabled - table notificacoes does not exist');
  }, [user?.id, profile?.id_empresa, supabase]);
  
  React.useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save theme to localStorage
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  const toggleTheme = () => {
    dispatch({ 
      type: 'SET_THEME', 
      payload: state.theme === 'light' ? 'dark' : 'light' 
    });
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificationId);

      if (error) throw error;
      dispatch({ type: 'MARK_NOTIFICATION_AS_READ', payload: notificationId });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, toggleTheme, markNotificationAsRead }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};