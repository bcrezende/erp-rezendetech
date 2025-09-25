import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { Bell, Clock, AlertCircle, Eye, X, Calendar, CheckCircle } from 'lucide-react';
import { Database } from '../../types/supabase';

type Lembrete = Database['public']['Tables']['lembretes']['Row'];

interface PendingRemindersPanelProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}

const PendingRemindersPanel: React.FC<PendingRemindersPanelProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const { isMobile, isTablet } = useDeviceDetection();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadLembretes();
  }, [dateFilter, profile]);

  const loadLembretes = async () => {
    setLoading(true);
    try {
      if (!profile?.id_empresa) {
        setLembretes([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('status', 'pendente')
        .eq('ativo', true)
        .gte('data_lembrete', dateFilter.startDate)
        .lte('data_lembrete', dateFilter.endDate)
        .order('data_lembrete', { ascending: true });

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      console.error('Error loading pending reminders:', error);
      setLembretes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (lembreteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lembretes')
        .update({ status: newStatus })
        .eq('id', lembreteId);

      if (error) throw error;
      await loadLembretes();
    } catch (error) {
      console.error('Error updating reminder status:', error);
      alert('Erro ao atualizar status do lembrete.');
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const formatDateFromString = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isOverdue = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const reminderDate = new Date(dateString + 'T12:00:00');
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const categorizedReminders = {
    hoje: lembretes.filter(l => isToday(l.data_lembrete)),
    vencidos: lembretes.filter(l => isOverdue(l.data_lembrete)),
    proximos: lembretes.filter(l => {
      const days = getDaysUntil(l.data_lembrete);
      return days > 0 && days <= 7;
    }),
    futuros: lembretes.filter(l => {
      const days = getDaysUntil(l.data_lembrete);
      return days > 7;
    })
  };

  if (loading) {
    return (
      <div className={`card-premium shadow-2xl border border-white/30 hover-lift relative overflow-hidden animate-slide-in-up ${
        isMobile ? 'rounded-2xl p-4' : 'rounded-3xl p-8'
      }`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="ml-3 text-gray-600">Carregando lembretes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-premium shadow-2xl border border-white/30 hover-lift relative overflow-hidden animate-slide-in-up ${
      isMobile ? 'rounded-2xl p-4' : 'rounded-3xl p-8'
    }`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-50/60 via-orange-50/40 to-red-50/60 ${
        isMobile ? 'rounded-2xl' : 'rounded-3xl'
      }`} />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3 relative z-10">
          <div className={`rounded-2xl shadow-xl hover-glow animate-scale-in ${
            lembretes.length > 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
          } ${isMobile ? 'p-2' : 'p-3'}`}>
            <Bell className={`text-white drop-shadow-lg ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
          </div>
          <div>
            <h3 className={`font-black bg-gradient-to-r from-gray-900 via-yellow-900 to-orange-900 bg-clip-text text-transparent tracking-tight ${
              isMobile ? 'text-base' : 'text-xl'
            }`}>
              Lembretes Pendentes
            </h3>
            <p className={`text-gray-700 dark:text-gray-300 font-bold tracking-wide ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              {isMobile ? 'Tarefas pendentes' : 'Tarefas e lembretes pendentes'}
            </p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-right relative z-10 glass rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-2 font-semibold animate-slide-in-from-right">
          {formatDateFromString(dateFilter.startDate)} - {formatDateFromString(dateFilter.endDate)}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className={`bg-white shadow-xl w-full overflow-hidden ${
            isMobile ? 'rounded-lg max-h-[90vh] max-w-full mx-2' : 'rounded-xl max-w-4xl max-h-[80vh]'
          }`}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Lembretes Pendentes - Detalhamento</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {lembretes.length} lembrete(s) pendente(s) no período
                  </p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[60vh] p-6">
              {lembretes.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">Nenhum lembrete pendente no período</p>
                  <p className="text-sm text-gray-400 mt-1">Todos os lembretes estão em dia!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Lembretes para Hoje */}
                  {categorizedReminders.hoje.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Para Hoje ({categorizedReminders.hoje.length})</span>
                      </h4>
                      <div className="space-y-3">
                        {categorizedReminders.hoje.map((lembrete) => (
                          <div key={lembrete.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-blue-900">{lembrete.titulo}</h5>
                                {lembrete.descricao && (
                                  <p className="text-sm text-blue-700 mt-1">{lembrete.descricao}</p>
                                )}
                                <p className="text-xs text-blue-600 mt-2 font-medium">
                                  📅 {formatDate(lembrete.data_lembrete)} • ID: {lembrete.id_sequencial}
                                </p>
                              </div>
                              <button
                                onClick={() => handleStatusChange(lembrete.id, 'concluido')}
                                className="ml-3 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Concluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lembretes Vencidos */}
                  {categorizedReminders.vencidos.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5" />
                        <span>Vencidos ({categorizedReminders.vencidos.length})</span>
                      </h4>
                      <div className="space-y-3">
                        {categorizedReminders.vencidos.map((lembrete) => (
                          <div key={lembrete.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-red-900">{lembrete.titulo}</h5>
                                {lembrete.descricao && (
                                  <p className="text-sm text-red-700 mt-1">{lembrete.descricao}</p>
                                )}
                                <p className="text-xs text-red-600 mt-2 font-medium">
                                  ⚠️ {formatDate(lembrete.data_lembrete)} • {Math.abs(getDaysUntil(lembrete.data_lembrete))} dias em atraso • ID: {lembrete.id_sequencial}
                                </p>
                              </div>
                              <button
                                onClick={() => handleStatusChange(lembrete.id, 'concluido')}
                                className="ml-3 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Concluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Próximos 7 dias */}
                  {categorizedReminders.proximos.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center space-x-2">
                        <Clock className="h-5 w-5" />
                        <span>Próximos 7 dias ({categorizedReminders.proximos.length})</span>
                      </h4>
                      <div className="space-y-3">
                        {categorizedReminders.proximos.map((lembrete) => (
                          <div key={lembrete.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-yellow-900">{lembrete.titulo}</h5>
                                {lembrete.descricao && (
                                  <p className="text-sm text-yellow-700 mt-1">{lembrete.descricao}</p>
                                )}
                                <p className="text-xs text-yellow-600 mt-2 font-medium">
                                  📅 {formatDate(lembrete.data_lembrete)} • Em {getDaysUntil(lembrete.data_lembrete)} dias • ID: {lembrete.id_sequencial}
                                </p>
                              </div>
                              <button
                                onClick={() => handleStatusChange(lembrete.id, 'concluido')}
                                className="ml-3 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Concluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lembretes Futuros */}
                  {categorizedReminders.futuros.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Futuros ({categorizedReminders.futuros.length})</span>
                      </h4>
                      <div className="space-y-3">
                        {categorizedReminders.futuros.map((lembrete) => (
                          <div key={lembrete.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{lembrete.titulo}</h5>
                                {lembrete.descricao && (
                                  <p className="text-sm text-gray-700 mt-1">{lembrete.descricao}</p>
                                )}
                                <p className="text-xs text-gray-600 mt-2 font-medium">
                                  📅 {formatDateTime(lembrete.data_lembrete, lembrete.hora_lembrete)} • Em {getDaysUntil(lembrete.data_lembrete)} dias • ID: {lembrete.id_sequencial}
                                </p>
                              </div>
                              <button
                                onClick={() => handleStatusChange(lembrete.id, 'concluido')}
                                className="ml-3 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              >
                                Concluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Card Principal Clicável */}
        <button
          onClick={() => setShowDetail(true)}
          className={`w-full border-3 shadow-2xl hover:shadow-3xl transition-all duration-500 hover-lift relative overflow-hidden animate-scale-in text-left ${
            lembretes.length > 0 
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
          } ${isMobile ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'}`}
        >
          <div className={`absolute inset-0 ${
            lembretes.length > 0 
              ? 'bg-gradient-to-r from-yellow-600/5 to-orange-600/5' 
              : 'bg-gradient-to-r from-gray-600/5 to-gray-600/5'
          }`} />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className={`font-black tracking-wider uppercase ${
                lembretes.length > 0 ? 'text-yellow-800' : 'text-gray-800'
              } ${isMobile ? 'text-sm' : 'text-lg'}`}>
                Lembretes Pendentes
              </p>
              <p className={`font-black tracking-tight drop-shadow-xl ${
                lembretes.length > 0 ? 'text-yellow-900' : 'text-gray-900'
              } ${isMobile ? 'text-3xl' : 'text-6xl'}`}>
                {lembretes.length}
              </p>
              <p className={`font-bold tracking-wide ${
                lembretes.length > 0 ? 'text-yellow-700' : 'text-gray-700'
              } ${isMobile ? 'text-xs mt-2' : 'text-sm mt-3'}`}>
                {lembretes.length === 0 ? 'Nenhum lembrete pendente' : 'Clique para ver detalhes'}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <Bell className={`${
                lembretes.length > 0 ? 'text-yellow-600' : 'text-gray-600'
              } drop-shadow-lg`} size={isMobile ? 20 : 24} />
              {!isMobile && <Eye className={`${
                lembretes.length > 0 ? 'text-yellow-600' : 'text-gray-600'
              } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} size={18} />}
            </div>
          </div>
        </button>

        {/* Breakdown por Categoria */}
        {lembretes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
            {/* Para Hoje */}
            <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 transition-all duration-500 text-center shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-left ${
              isMobile ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
            }`}>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Calendar className="text-blue-600" size={isMobile ? 16 : 20} />
                <p className={`font-black text-blue-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Hoje
                </p>
              </div>
              <p className={`font-black text-blue-900 tracking-tight drop-shadow-lg ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                {categorizedReminders.hoje.length}
              </p>
            </div>

            {/* Vencidos */}
            <div className={`bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 transition-all duration-500 text-center shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-left stagger-1 ${
              isMobile ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
            }`}>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <AlertCircle className="text-red-600" size={isMobile ? 16 : 20} />
                <p className={`font-black text-red-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Vencidos
                </p>
              </div>
              <p className={`font-black text-red-900 tracking-tight drop-shadow-lg ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                {categorizedReminders.vencidos.length}
              </p>
            </div>

            {/* Próximos 7 dias */}
            <div className={`bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 transition-all duration-500 text-center shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-right ${
              isMobile ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
            }`}>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="text-yellow-600" size={isMobile ? 16 : 20} />
                <p className={`font-black text-yellow-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  7 dias
                </p>
              </div>
              <p className={`font-black text-yellow-900 tracking-tight drop-shadow-lg ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                {categorizedReminders.proximos.length}
              </p>
            </div>

            {/* Futuros */}
            <div className={`bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-300 transition-all duration-500 text-center shadow-xl hover:shadow-2xl hover-lift interactive-card animate-slide-in-from-right stagger-1 ${
              isMobile ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
            }`}>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Calendar className="text-gray-600" size={isMobile ? 16 : 20} />
                <p className={`font-black text-gray-800 tracking-wider uppercase ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Futuros
                </p>
              </div>
              <p className={`font-black text-gray-900 tracking-tight drop-shadow-lg ${
                isMobile ? 'text-xl' : 'text-2xl'
              }`}>
                {categorizedReminders.futuros.length}
              </p>
            </div>
          </div>
        )}

        {/* Resumo Rápido */}
        <div className={`glass shadow-lg border border-white/30 relative z-10 animate-slide-in-up ${
          isMobile ? 'p-3 rounded-xl' : 'p-5 rounded-2xl'
        }`}>
          <p className={`text-gray-700 dark:text-gray-300 text-center font-bold tracking-wide ${
            isMobile ? 'text-xs' : 'text-sm'
          }`}>
            {lembretes.length === 0 
              ? '✅ Parabéns! Você não tem lembretes pendentes no período selecionado'
              : `📋 ${lembretes.length} lembrete(s) aguardando sua atenção • Clique no card principal para gerenciar`
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingRemindersPanel;