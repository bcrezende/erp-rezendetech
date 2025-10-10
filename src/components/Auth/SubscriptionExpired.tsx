import React, { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, Clock, Phone, RefreshCw, Calendar } from 'lucide-react';

interface SubscriptionExpiredProps {
  profile: any;
  onRefresh?: () => void;
}

const SubscriptionExpired: React.FC<SubscriptionExpiredProps> = ({ profile, onRefresh }) => {
  const [checking, setChecking] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [error, setError] = useState('');

  const statusMessages: Record<string, { title: string; message: string; color: string }> = {
    'past_due': {
      title: 'Pagamento em Atraso',
      message: 'Seu último pagamento não foi processado. Atualize seu método de pagamento para continuar usando o sistema.',
      color: 'orange'
    },
    'canceled': {
      title: 'Assinatura Cancelada',
      message: 'Sua assinatura foi cancelada. Reative sua conta para continuar tendo acesso ao sistema.',
      color: 'red'
    },
    'unpaid': {
      title: 'Pagamento Pendente',
      message: 'Há faturas pendentes em sua conta. Regularize seu pagamento para reativar o acesso.',
      color: 'red'
    },
    'incomplete': {
      title: 'Assinatura Incompleta',
      message: 'Sua assinatura não foi completada. Entre em contato com o suporte para resolver esta situação.',
      color: 'yellow'
    },
    'incomplete_expired': {
      title: 'Assinatura Expirada',
      message: 'O período para completar sua assinatura expirou. Inicie um novo processo de assinatura.',
      color: 'red'
    }
  };

  const currentStatus = statusMessages[profile?.status_assinatura || 'past_due'] || statusMessages['past_due'];

  const checkSubscriptionStatus = async () => {
    if (!profile?.assinatura_id) {
      setError('ID de assinatura não encontrado');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/get-subscription-info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assinatura_id: profile.assinatura_id,
          user_id: profile.id
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar status da assinatura');
      }

      const data = await response.json();
      setSubscriptionInfo(data);

      if (data.assinatura_ativa) {
        if (onRefresh) {
          onRefresh();
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError('Não foi possível verificar o status da assinatura. Tente novamente em alguns minutos.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (profile?.assinatura_id) {
      checkSubscriptionStatus();
    }
  }, []);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-500',
          border: 'border-red-200',
          text: 'text-red-700',
          bgLight: 'bg-red-50'
        };
      case 'orange':
        return {
          bg: 'bg-orange-500',
          border: 'border-orange-200',
          text: 'text-orange-700',
          bgLight: 'bg-orange-50'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-500',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          bgLight: 'bg-yellow-50'
        };
      default:
        return {
          bg: 'bg-red-500',
          border: 'border-red-200',
          text: 'text-red-700',
          bgLight: 'bg-red-50'
        };
    }
  };

  const colors = getColorClasses(currentStatus.color);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center mb-8">
          <div className={`mx-auto h-20 w-20 ${colors.bg} rounded-full flex items-center justify-center mb-6 animate-pulse`}>
            <AlertCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {currentStatus.title}
          </h1>
          <p className="text-lg text-gray-600">
            {currentStatus.message}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="space-y-6">
            {subscriptionInfo && (
              <div className={`${colors.bgLight} border ${colors.border} rounded-lg p-6`}>
                <h3 className={`font-semibold ${colors.text} mb-4 flex items-center`}>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Informações da Assinatura
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <p className={`font-semibold ${colors.text}`}>
                      {subscriptionInfo.status === 'active' ? 'Ativa' :
                       subscriptionInfo.status === 'past_due' ? 'Pagamento Atrasado' :
                       subscriptionInfo.status === 'canceled' ? 'Cancelada' :
                       subscriptionInfo.status === 'unpaid' ? 'Não Paga' :
                       subscriptionInfo.status}
                    </p>
                  </div>
                  {subscriptionInfo.proximoPagamento && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {subscriptionInfo.dias_ate_vencimento && subscriptionInfo.dias_ate_vencimento < 0
                          ? 'Venceu em'
                          : 'Próximo Pagamento'}
                      </label>
                      <p className="font-semibold text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(subscriptionInfo.proximoPagamento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {subscriptionInfo.valor && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
                      <p className="font-semibold text-gray-900">
                        R$ {Number(subscriptionInfo.valor).toFixed(2)}
                      </p>
                    </div>
                  )}
                  {subscriptionInfo.dias_ate_vencimento !== null && subscriptionInfo.dias_ate_vencimento < 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Dias em Atraso</label>
                      <p className={`font-bold ${colors.text}`}>
                        {Math.abs(subscriptionInfo.dias_ate_vencimento)} dias
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">O que fazer agora?</h3>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={checkSubscriptionStatus}
                  disabled={checking}
                  className="flex items-center justify-center space-x-3 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checking ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Verificando Status...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      <span>Verificar Status Novamente</span>
                    </>
                  )}
                </button>

                <a
                  href="https://api.whatsapp.com/send?phone=5519993990280&text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20minha%20assinatura"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-3 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  <span>Falar com Suporte via WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <div className="flex items-start space-x-3">
                <Clock className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <h4 className="font-semibold mb-2">Informações Importantes</h4>
                  <ul className="space-y-2">
                    <li>• Seus dados estão seguros e não serão perdidos</li>
                    <li>• Após regularizar o pagamento, o acesso será reativado automaticamente</li>
                    <li>• O suporte está disponível para ajudar com qualquer dúvida</li>
                    <li>• Verificações de status são atualizadas automaticamente a cada 24 horas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {profile?.empresas?.nome && (
          <div className="text-center text-sm text-gray-500">
            <p>Empresa: <span className="font-semibold text-gray-700">{profile.empresas.nome}</span></p>
            {profile.assinatura_id && (
              <p className="mt-1">ID da Assinatura: <span className="font-mono text-xs">{profile.assinatura_id}</span></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionExpired;
