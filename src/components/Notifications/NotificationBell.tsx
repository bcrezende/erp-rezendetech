import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Bell, X, Clock, CheckCircle, Trash2 } from 'lucide-react';

const NotificationBell: React.FC = () => {
  const { state, markNotificationAsRead } = useAppContext();
  const [showPanel, setShowPanel] = useState(false);
  
  // Early return if notifications are not available
  if (!state.notifications || state.notifications.length === 0) {
    return null; // Hide notification bell when no notifications system is available
  }

  const unreadCount = state.notifications.filter(n => !n.lida).length;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'lembrete':
        return '🔔';
      case 'vencimento':
        return '⚠️';
      case 'financeiro':
        return '💰';
      default:
        return '📢';
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = state.notifications.filter(n => !n.lida);
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notificações
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {state.notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Nenhuma notificação
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Você está em dia com tudo!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {state.notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !notification.lida ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.tipo)}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          !notification.lida 
                            ? 'font-semibold text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.mensagem}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(notification.data_envio)}
                          </span>
                          
                          {!notification.lida && (
                            <button
                              onClick={() => markNotificationAsRead(notification.id)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                              Marcar como lida
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!notification.lida && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.notifications.length > 20 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando as 20 notificações mais recentes
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;