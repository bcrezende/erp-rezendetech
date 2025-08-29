export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  address: string;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  address: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  createdAt: Date;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  agency: string;
  accountNumber: string;
  balance: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: Date;
  accountId: string;
  clientId?: string;
  supplierId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  origem?: 'manual' | 'whatsapp_ia' | 'api';
  createdAt: Date;
}

export interface SaleOrder {
  id: string;
  clientId: string;
  items: OrderItem[];
  total: number;
  status: 'draft' | 'confirmed' | 'delivered' | 'cancelled';
  date: Date;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: OrderItem[];
  total: number;
  status: 'draft' | 'confirmed' | 'received' | 'cancelled';
  date: Date;
  createdAt: Date;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface DREData {
  period: string;
  grossRevenue: number;
  deductions: number;
  netRevenue: number;
  costs: number;
  grossProfit: number;
  operatingExpenses: number;
  financialResult: number;
  taxes: number;
  netProfit: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface EstimateData {
  currentRevenue: number;
  currentExpenses: number;
  currentProfit: number;
  estimatedRevenue: number;
  estimatedExpenses: number;
  estimatedProfit: number;
  daysElapsed: number;
  totalDays: number;
}

export interface WhatsAppMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  processed: boolean;
  extractedData?: Partial<Transaction>;
  timestamp: Date;
}