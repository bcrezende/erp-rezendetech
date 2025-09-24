import { useState, useEffect } from 'react';

export interface RouteConfig {
  path: string;
  component: string;
  title: string;
  subtitle: string;
  requiresAuth?: boolean;
  requiresCompany?: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Visão geral do seu negócio',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/auth',
    component: 'auth',
    title: 'Autenticação',
    subtitle: 'Acesse sua conta',
    requiresAuth: false
  },
  {
    path: '/transacoes',
    component: 'transactions',
    title: 'Transações',
    subtitle: 'Controle de receitas e despesas',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/contas-a-pagar',
    component: 'accounts-payable',
    title: 'Contas a Pagar',
    subtitle: 'Gerencie valores a pagar para fornecedores',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/contas-a-receber',
    component: 'accounts-receivable',
    title: 'Contas a Receber',
    subtitle: 'Gerencie valores a receber de clientes',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/indicadores-financeiros',
    component: 'financial-indicators',
    title: 'Indicadores Financeiros',
    subtitle: 'Acompanhe valores vencidos e indicadores críticos',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/pessoas',
    component: 'people',
    title: 'Gestão de Pessoas',
    subtitle: 'Cadastro unificado de clientes, fornecedores e colaboradores',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/produtos',
    component: 'products',
    title: 'Produtos e Serviços',
    subtitle: 'Gerencie seu catálogo',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/categorias',
    component: 'categories',
    title: 'Categorias',
    subtitle: 'Gerencie categorias e classificações para DRE',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/vendas',
    component: 'sales',
    title: 'Vendas',
    subtitle: 'Gerencie pedidos e faturamento',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/compras',
    component: 'purchases',
    title: 'Compras',
    subtitle: 'Pedidos de compra',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/lembretes',
    component: 'reminders',
    title: 'Lembretes',
    subtitle: 'Gerencie seus lembretes e notificações',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/relatorios',
    component: 'reports',
    title: 'Relatórios',
    subtitle: 'Análises e indicadores',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/configuracoes',
    component: 'settings',
    title: 'Configurações do Usuário',
    subtitle: 'Configurações da sua conta',
    requiresAuth: true
  },
  {
    path: '/configuracoes-empresa',
    component: 'company-settings',
    title: 'Configurações da Empresa',
    subtitle: 'Dados e informações da empresa',
    requiresAuth: true
  },
  {
    path: '/reset-password',
    component: 'reset-password',
    title: 'Redefinir Senha',
    subtitle: 'Altere sua senha de acesso',
    requiresAuth: false
  }
];

export const useRouter = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentComponent, setCurrentComponent] = useState('dashboard');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const route = routes.find(r => r.path === currentPath);
    if (route) {
      setCurrentComponent(route.component);
    } else {
      // Default to dashboard for unknown routes
      setCurrentComponent('dashboard');
    }
  }, [currentPath]);

  const navigate = (path: string) => {
    const route = routes.find(r => r.path === path);
    if (route) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setCurrentComponent(route.component);
    }
  };

  const navigateByComponent = (component: string) => {
    const route = routes.find(r => r.component === component);
    if (route) {
      navigate(route.path);
    }
  };

  const getCurrentRoute = () => {
    return routes.find(r => r.component === currentComponent);
  };

  return {
    currentPath,
    currentComponent,
    navigate,
    navigateByComponent,
    getCurrentRoute,
    routes
  };
};