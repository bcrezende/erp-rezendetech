import { useState, useEffect } from 'react';

export interface RouteConfig {
  path: string;
  component: string;
  title: string;
  subtitle: string;
  requiresAuth?: boolean;
  requiresCompany?: boolean;
  requiresEnterprisePlan?: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: 'dashboard',
    title: 'RezendeTECH - Dashboard',
    subtitle: 'Visão geral do seu negócio',
    requiresAuth: true,
    requiresCompany: true,
    requiresEnterprisePlan: true
  },
  {
    path: '/auth',
    component: 'auth',
    title: 'RezendeTECH - Login',
    subtitle: 'Acesse sua conta',
    requiresAuth: false
  },
  {
    path: '/transacoes',
    component: 'transactions',
    title: 'RezendeTECH - Transações',
    subtitle: 'Controle de receitas e despesas',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/contas-a-pagar',
    component: 'accounts-payable',
    title: 'RezendeTECH - Contas a Pagar',
    subtitle: 'Gerencie valores a pagar para fornecedores',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/contas-a-receber',
    component: 'accounts-receivable',
    title: 'RezendeTECH - Contas a Receber',
    subtitle: 'Gerencie valores a receber de clientes',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/indicadores-financeiros',
    component: 'financial-indicators',
    title: 'RezendeTECH - Indicadores Financeiros',
    subtitle: 'Acompanhe valores vencidos e indicadores críticos',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/pessoas',
    component: 'people',
    title: 'RezendeTECH - Gestão de Pessoas',
    subtitle: 'Cadastro unificado de clientes, fornecedores e colaboradores',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/produtos',
    component: 'products',
    title: 'RezendeTECH - Produtos e Serviços',
    subtitle: 'Gerencie seu catálogo',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/categorias',
    component: 'categories',
    title: 'RezendeTECH - Categorias',
    subtitle: 'Gerencie categorias e classificações para DRE',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/vendas',
    component: 'sales',
    title: 'RezendeTECH - Vendas',
    subtitle: 'Gerencie pedidos e faturamento',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/compras',
    component: 'purchases',
    title: 'RezendeTECH - Compras',
    subtitle: 'Pedidos de compra',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/lembretes',
    component: 'reminders',
    title: 'RezendeTECH - Lembretes',
    subtitle: 'Gerencie seus lembretes e notificações',
    requiresAuth: true,
    requiresCompany: true
  },
  {
    path: '/relatorios',
    component: 'reports',
    title: 'RezendeTECH - Relatórios',
    subtitle: 'Análises e indicadores',
    requiresAuth: true,
    requiresCompany: true,
    requiresEnterprisePlan: true
  },
  {
    path: '/configuracoes',
    component: 'settings',
    title: 'RezendeTECH - Configurações do Usuário',
    subtitle: 'Configurações da sua conta',
    requiresAuth: true
  },
  {
    path: '/configuracoes-empresa',
    component: 'company-settings',
    title: 'RezendeTECH - Configurações da Empresa',
    subtitle: 'Dados e informações da empresa',
    requiresAuth: true
  },
  {
    path: '/reset-password',
    component: 'reset-password',
    title: 'RezendeTECH - Redefinir Senha',
    subtitle: 'Altere sua senha de acesso',
    requiresAuth: false
  },
  {
    path: '/planos',
    component: 'pricing-plans',
    title: 'RezendeTECH - Planos e Preços',
    subtitle: 'Escolha o plano ideal para sua empresa',
    requiresAuth: false
  }
];

export const useRouter = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [forceUpdate, setForceUpdate] = useState(0);

  const getInitialComponent = () => {
    const route = routes.find(r => r.path === window.location.pathname);
    return route ? route.component : 'dashboard';
  };

  const [currentComponent, setCurrentComponent] = useState(getInitialComponent());

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const route = routes.find(r => r.path === currentPath);
    if (route) {
      setCurrentComponent(route.component);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const defaultRoute = routes.find(r => r.path === '/');
      setCurrentComponent(defaultRoute ? defaultRoute.component : 'dashboard');
    }
  }, [currentPath, forceUpdate]);

  const navigate = (path: string) => {
    const route = routes.find(r => r.path === path);
    if (route) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setCurrentComponent(route.component);
      setForceUpdate(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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