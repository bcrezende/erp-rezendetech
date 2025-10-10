import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CreditCard, Calendar } from 'lucide-react';

interface SubscriptionAlertProps {
  profile: any;
  onDismiss?: () => void;
}

const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({ profile, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedKey = `subscription-alert-dismissed-${profile?.id}`;
    const lastDismissed = localStorage.getItem(dismissedKey);
    const now = Date.now();

    if (lastDismissed && now - parseInt(lastDismissed) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    if (profile?.proxima_data_pagamento) {
      const nextPaymentDate = new Date(profile.proxima_data_pagamento);
      const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - now) / (1000 * 60 * 60 * 24));

      if (daysUntilPayment >= 0 && daysUntilPayment <= 7) {
        setVisible(true);
      }
    }
  }, [profile]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);

    const dismissedKey = `subscription-alert-dismissed-${profile?.id}`;
    localStorage.setItem(dismissedKey, Date.now().toString());

    if (onDismiss) {
      onDismiss();
    }
  };

  if (!visible || dismissed || !profile?.proxima_data_pagamento) {
    return null;
  }

  const nextPaymentDate = new Date(profile.proxima_data_pagamento);
  const daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getAlertColor = () => {
    if (daysUntilPayment <= 1) return 'red';
    if (daysUntilPayment <= 3) return 'orange';
    return 'yellow';
  };

  const color = getAlertColor();

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      text: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-800',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    }
  };

  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} border-l-4 ${classes.border} p-4 mb-6 rounded-r-lg shadow-sm animate-slide-in-down`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertTriangle className={`h-6 w-6 ${classes.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h3 className={`font-semibold ${classes.text} mb-2`}>
              {daysUntilPayment === 0 ? 'Pagamento Vence Hoje!' :
               daysUntilPayment === 1 ? 'Pagamento Vence Amanhã!' :
               `Pagamento Vence em ${daysUntilPayment} Dias`}
            </h3>
            <p className={`text-sm ${classes.text} mb-3`}>
              Sua próxima cobrança será processada em{' '}
              <span className="font-semibold">
                {nextPaymentDate.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              . Certifique-se de que seu método de pagamento está atualizado para evitar interrupções no serviço.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://api.whatsapp.com/send?phone=5519993990280&text=Ol%C3%A1%2C%20gostaria%20de%20atualizar%20meu%20m%C3%A9todo%20de%20pagamento"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center space-x-2 px-4 py-2 ${classes.button} text-white text-sm font-medium rounded-lg transition-colors`}
              >
                <CreditCard className="h-4 w-4" />
                <span>Atualizar Pagamento</span>
              </a>
              <button
                onClick={() => window.location.href = '/configuracoes'}
                className={`inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 ${classes.text} text-sm font-medium rounded-lg transition-colors`}
              >
                <Calendar className="h-4 w-4" />
                <span>Ver Detalhes</span>
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className={`${classes.text} hover:bg-white/50 rounded-lg p-1 transition-colors ml-2 flex-shrink-0`}
          aria-label="Fechar alerta"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionAlert;
