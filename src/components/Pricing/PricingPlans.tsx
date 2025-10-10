import React from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useRouter } from '../../hooks/useRouter';
import {
  Check,
  X,
  Sparkles,
  TrendingUp,
  Users,
  BarChart3,
  FileText,
  Zap,
  Shield,
  ArrowRight,
  Building
} from 'lucide-react';

const PricingPlans: React.FC = () => {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();

  const basicPaymentUrl = 'https://api.whatsapp.com/send?phone=5519993990280&text=Ol%C3%A1%2C+quero+fazer+o+upgrade+para+o+plano+Enterprise%21';

  const enterprisePaymentUrl = 'https://buy.stripe.com/test_fZuaEW69B3981eK9uA5kk01';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/10f97f14-9488-4367-a784-0868f7340b82 copy.png"
              alt="RezendeTech Logo"
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Escolha o Plano Ideal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sistema ERP completo para gestão empresarial com IA integrada
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Plano Básico</h2>
                <p className="text-gray-600">Ideal para começar</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg">
                <Building className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">R$ 29,90</span>
                <span className="text-xl text-gray-600 ml-2">/mês</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Sem contrato de fidelidade</p>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-gray-900 text-lg mb-4">O que está incluído:</h3>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Transações básicas</p>
                  <p className="text-sm text-gray-500">Controle completo de receitas e despesas</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Gestão de pessoas</p>
                  <p className="text-sm text-gray-500">Cadastro de clientes, fornecedores e colaboradores</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Contas a pagar e receber</p>
                  <p className="text-sm text-gray-500">Controle financeiro completo</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">Lembretes e notificações</p>
                  <p className="text-sm text-gray-500">Nunca perca prazos importantes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Dashboard completo</p>
                  <p className="text-sm text-gray-400">Disponível no Plano Empresarial</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 font-medium">DRE detalhado</p>
                  <p className="text-sm text-gray-400">Disponível no Plano Empresarial</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Relatórios avançados</p>
                  <p className="text-sm text-gray-400">Disponível no Plano Empresarial</p>
                </div>
              </div>
            </div>

            <a
              href={basicPaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">Começar com Básico</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </a>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl border-2 border-blue-500 p-8 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-2 rounded-bl-xl font-bold text-sm shadow-lg">
              MAIS POPULAR
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Plano Empresarial</h2>
                <p className="text-blue-100">Completo para sua empresa</p>
              </div>
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-white">R$ 199,90</span>
                <span className="text-xl text-blue-100 ml-2">/mês</span>
              </div>
              <p className="text-sm text-blue-100 mt-2">Acesso total ao sistema</p>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-white text-lg mb-4">Tudo do Básico, mais:</h3>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Dashboard completo</p>
                  <p className="text-sm text-blue-100">Visão geral do seu negócio em tempo real</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">DRE completo</p>
                  <p className="text-sm text-blue-100">Demonstração de resultados detalhada</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Análise de fluxo de caixa</p>
                  <p className="text-sm text-blue-100">Previsões e projeções financeiras</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Relatórios avançados</p>
                  <p className="text-sm text-blue-100">Exportação em Excel e PDF</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Indicadores financeiros</p>
                  <p className="text-sm text-blue-100">Métricas e KPIs essenciais</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Previsões de negócio</p>
                  <p className="text-sm text-blue-100">Análise preditiva com IA</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Usuários ilimitados</p>
                  <p className="text-sm text-blue-100">Toda sua equipe conectada</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <Check className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-medium">Suporte prioritário</p>
                  <p className="text-sm text-blue-100">Atendimento rápido e dedicado</p>
                </div>
              </div>
            </div>

            <a
              href={enterprisePaymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="h-5 w-5" />
                <span className="text-lg">Começar com Empresarial</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Garantia de Satisfação</h3>
            </div>
            <p className="text-gray-600">
              Teste qualquer plano por 7 dias. Se não ficar satisfeito, devolvemos seu dinheiro sem perguntas.
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🧪</span>
              <div>
                <h4 className="font-bold text-yellow-900 mb-2">Ambiente de Teste</h4>
                <div className="text-sm text-yellow-800 space-y-1">
                  <p>• Este é um ambiente de teste para validação do sistema</p>
                  <p>• Nenhuma cobrança real será efetuada neste momento</p>
                  <p>• Use dados fictícios para testar o fluxo de assinatura</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!user && (
          <div className="text-center">
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center space-x-2 px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
            >
              <span>Já tem uma conta? Faça login</span>
            </button>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 RezendeTech. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
