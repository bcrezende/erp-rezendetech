import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Bell, X, Clock, AlertCircle, Calendar, CheckCircle } from 'lucide-react';

const NotificationToast: React.FC = () => {
  const { state, markNotificationAsRead } = useAppContext();
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  
  // Early return if notifications are not available
  if (!state.notifications || state.notifications.length === 0) {
    return null;
  }

  // Show new unread notifications as toasts
  useEffect(() => {
    const unreadNotifications = state.notifications.filter(n => 
      !n.lida && 
      !dismissedNotifications.has(n.id) &&
      !visibleNotifications.includes(n.id)
    );

    if (unreadNotifications.length > 0) {
      const newNotification = unreadNotifications[0];
      setVisibleNotifications(prev => [...prev, newNotification.id]);

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        dismissNotification(newNotification.id);
      }, 8000);
    }
  }, [state.notifications, dismissedNotifications, visibleNotifications]);

  const dismissNotification = (notificationId: string) => {
    setVisibleNotifications(prev => prev.filter(id => id !== notificationId));
    setDismissedNotifications(prev => new Set([...prev, notificationId]));
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    dismissNotification(notificationId);
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'lembrete':
        return Bell;
      case 'vencimento':
        return AlertCircle;
      case 'financeiro':
        return Calendar;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (tipo: string) => {
    switch (tipo) {
      case 'lembrete':
        return 'from-blue-500 to-blue-600';
      case 'vencimento':
        return 'from-red-500 to-red-600';
      case 'financeiro':
        return 'from-green-500 to-green-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const notificationsToShow = state.notifications.filter(n => 
    visibleNotifications.includes(n.id)
  );

  if (notificationsToShow.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notificationsToShow.map((notification) => {
        const Icon = getNotificationIcon(notification.tipo);
        const colorClass = getNotificationColor(notification.tipo);

        return (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 transform transition-all duration-500 ease-out animate-slide-in-from-right hover:scale-105`}
            style={{
              animation: 'slideInFromRight 0.5s ease-out, fadeOut 0.5s ease-in 7.5s forwards'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full bg-gradient-to-r ${colorClass} shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    notification.tipo === 'lembrete' ? 'bg-blue-100 text-blue-700' :
                    notification.tipo === 'vencimento' ? 'bg-red-100 text-red-700' :
                    notification.tipo === 'financeiro' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {notification.tipo === 'lembrete' ? '🔔 Lembrete' :
                     notification.tipo === 'vencimento' ? '⚠️ Vencimento' :
                     notification.tipo === 'financeiro' ? '💰 Financeiro' :
                     '📢 Sistema'}
                  </span>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-900 dark:text-white font-medium mb-2">
                  {notification.mensagem}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(notification.data_envio)}
                  </span>
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Marcar como lida
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;