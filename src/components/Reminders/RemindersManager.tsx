import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Plus, Search, CreditCard as Edit, Trash2, Bell, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, Eye, X, Grid3x3 as Grid3X3, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Database } from '../../types/supabase';

type Lembrete = Database['public']['Tables']['lembretes']['Row'];
type LembreteInsert = Database['public']['Tables']['lembretes']['Insert'];

const RemindersManager: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLembrete, setEditingLembrete] = useState<Lembrete | null>(null);
  const [viewingLembrete, setViewingLembrete] = useState<Lembrete | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    status: 'all',
    periodo: 'all'
  });

  const [formData, setFormData] = useState<Partial<LembreteInsert>>({
    titulo: '',
    descricao: '',
    data_lembrete: new Date().toISOString().split('T')[0],
    hora_lembrete: '',
    status: 'pendente',
  });

  useEffect(() => {
    if (profile?.id_empresa) {
      loadLembretes();
    }
  }, [profile]);

  const loadLembretes = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setLembretes([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('lembretes')
        .select('*')
        .eq('id_empresa', profile.id_empresa)
        .eq('ativo', true)
        .order('data_lembrete', { ascending: true });

      if (error) throw error;
      setLembretes(data || []);
    } catch (error) {
      console.error('Error loading lembretes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id_empresa || !profile?.id) return;

    try {
      const lembreteData = {
        ...formData,
        id_empresa: profile.id_empresa,
      };

      if (editingLembrete) {
        const { error } = await supabase
          .from('lembretes')
          .update(lembreteData)
          .eq('id', editingLembrete.id);

        if (error) throw error;
        alert('Lembrete atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('lembretes')
          .insert(lembreteData);

        if (error) throw error;
        alert('Lembrete criado com sucesso!');
      }

      await loadLembretes();
      resetForm();
    } catch (error) {
      console.error('Error saving lembrete:', error);
      alert('Erro ao salvar lembrete. Tente novamente.');
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
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status do lembrete.');
    }
  };

  const handleEdit = (lembrete: Lembrete) => {
    setEditingLembrete(lembrete);
    setFormData({
      titulo: lembrete.titulo,
      descricao: lembrete.descricao,
      data_lembrete: lembrete.data_lembrete,
      hora_lembrete: lembrete.hora_lembrete || '',
      status: lembrete.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('lembretes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadLembretes();
      alert('Lembrete excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting lembrete:', error);
      alert('Erro ao excluir lembrete. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      data_lembrete: new Date().toISOString().split('T')[0],
      hora_lembrete: '',
      status: 'pendente',
    });
    setEditingLembrete(null);
    setShowForm(false);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      concluido: 'bg-green-100 text-green-700 border-green-200',
      cancelado: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return Clock;
      case 'concluido':
        return CheckCircle;
      case 'cancelado':
        return X;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendente: 'Pendente',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const isToday = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isOverdue = (dateString: string, status: string) => {
    if (status !== 'pendente') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const reminderDate = new Date(dateString);
    const diffTime = reminderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredLembretes = lembretes.filter(lembrete => {
    const matchesSearch = lembrete.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lembrete.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || lembrete.status === filters.status;
    
    let matchesPeriod = true;
    if (filters.periodo === 'hoje') {
      matchesPeriod = isToday(lembrete.data_lembrete);
    } else if (filters.periodo === 'proximos') {
      const days = getDaysUntil(lembrete.data_lembrete);
      matchesPeriod = days >= 0 && days <= 7;
    } else if (filters.periodo === 'vencidos') {
      matchesPeriod = isOverdue(lembrete.data_lembrete, lembrete.status);
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totals = lembretes.reduce((acc, lembrete) => {
    if (lembrete.status === 'pendente') {
      acc.pendentes += 1;
      if (isToday(lembrete.data_lembrete)) {
        acc.hoje += 1;
      }
      if (isOverdue(lembrete.data_lembrete, lembrete.status)) {
        acc.vencidos += 1;
      }
    } else if (lembrete.status === 'concluido') {
      acc.concluidos += 1;
    }
    return acc;
  }, { pendentes: 0, hoje: 0, vencidos: 0, concluidos: 0 });

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getRemindersForDate = (dateString: string) => {
    return lembretes.filter(lembrete => lembrete.data_lembrete === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    const days = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 sm:h-32"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReminders = getRemindersForDate(dateString);
      const isCurrentDay = dateString === today;
      
      days.push(
        <div
          key={day}
          className={`h-24 sm:h-32 border border-gray-200 p-1 sm:p-2 overflow-hidden hover:bg-gray-50 transition-colors ${
            isCurrentDay ? 'bg-blue-50 border-blue-300' : ''
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isCurrentDay ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
            {isCurrentDay && <span className="ml-1 text-xs text-blue-500">hoje</span>}
          </div>
          
          <div className="space-y-1">
            {dayReminders.slice(0, 3).map((lembrete) => {
              const StatusIcon = getStatusIcon(lembrete.status);
              return (
                <button
                  key={lembrete.id}
                  onClick={() => setViewingLembrete(lembrete)}
                  className={`w-full text-left p-1 rounded text-xs hover:shadow-sm transition-all ${
                    lembrete.status === 'pendente' 
                      ? isOverdue(lembrete.data_lembrete, lembrete.status)
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : lembrete.status === 'concluido'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    <StatusIcon size={10} />
                    <span className="truncate">{lembrete.titulo}</span>
                  </div>
                  {lembrete.hora_lembrete && (
                    <div className="text-xs opacity-75 mt-0.5">
                      {lembrete.hora_lembrete}
                    </div>
                  )}
                </button>
              );
            })}
            
            {dayReminders.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayReminders.length - 3} mais
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 capitalize">
            {monthName}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Hoje
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>

        {/* Calendar legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-gray-600">Pendente</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-gray-600">Vencido</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-gray-600">Concluído</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div>
              <span className="text-gray-600">Hoje</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCardsView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredLembretes.map((lembrete) => {
          const StatusIcon = getStatusIcon(lembrete.status);
          const isReminderToday = isToday(lembrete.data_lembrete);
          const isReminderOverdue = isOverdue(lembrete.data_lembrete, lembrete.status);
          const daysUntil = getDaysUntil(lembrete.data_lembrete);
          
          return (
            <div 
              key={lembrete.id} 
              className={`bg-white rounded-xl shadow-sm border-2 p-4 sm:p-6 hover:shadow-md transition-all duration-200 ${
                isReminderOverdue ? 'border-red-200 bg-red-50' :
                isReminderToday ? 'border-blue-200 bg-blue-50' :
                daysUntil <= 3 && lembrete.status === 'pendente' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200'
              }`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <StatusIcon size={18} className={
                      lembrete.status === 'pendente' ? 'text-yellow-600' :
                      lembrete.status === 'concluido' ? 'text-green-600' :
                      'text-gray-600'
                    } />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {lembrete.titulo}
                    </h3>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lembrete.status)}`}>
                    {getStatusLabel(lembrete.status)}
                  </span>
                </div>
                
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => setViewingLembrete(lembrete)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(lembrete)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(lembrete.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Descrição (se houver) */}
              {lembrete.descricao && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {lembrete.descricao}
                </p>
              )}

              {/* Data e Hora */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar size={14} className="text-gray-500" />
                  <span className={`font-medium ${
                    isReminderOverdue ? 'text-red-600' :
                    isReminderToday ? 'text-blue-600' :
                    'text-gray-900'
                  }`}>
                    {formatDate(lembrete.data_lembrete)}
                  </span>
                  
                  {/* Badges de status da data */}
                  {isReminderToday && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Hoje
                    </span>
                  )}
                  {isReminderOverdue && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      Vencido
                    </span>
                  )}
                </div>

                {lembrete.hora_lembrete && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>{lembrete.hora_lembrete}</span>
                  </div>
                )}

                {/* Informação de dias restantes/vencidos */}
                {lembrete.status === 'pendente' && !isReminderToday && (
                  <div className="text-xs text-gray-500">
                    {isReminderOverdue 
                      ? `Vencido há ${Math.abs(getDaysUntil(lembrete.data_lembrete))} dias`
                      : `Em ${getDaysUntil(lembrete.data_lembrete)} dias`
                    }
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {lembrete.status === 'pendente' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(lembrete.id, 'concluido')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Concluir
                    </button>
                    <button
                      onClick={() => handleStatusChange(lembrete.id, 'cancelado')}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lembretes</h1>
            <p className="text-gray-600">Gerencie seus lembretes e notificações</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 size={16} />
              <span className="text-sm font-medium">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays size={16} />
              <span className="text-sm font-medium">Calendário</span>
            </button>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Novo Lembrete</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600">
                {totals.pendentes}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Para Hoje</p>
              <p className="text-3xl font-bold text-blue-600">
                {totals.hoje}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidos</p>
              <p className="text-3xl font-bold text-red-600">
                {totals.vencidos}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concluídos</p>
              <p className="text-3xl font-bold text-green-600">
                {totals.concluidos}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Only show for cards view */}
      {viewMode === 'cards' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar lembretes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={filters.periodo}
              onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os períodos</option>
              <option value="hoje">Para hoje</option>
              <option value="proximos">Próximos 7 dias</option>
              <option value="vencidos">Vencidos</option>
            </select>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'cards' ? renderCardsView() : renderCalendarView()}

      {/* Empty state for cards view */}
      {viewMode === 'cards' && filteredLembretes.length === 0 && (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum lembrete encontrado
          </h3>
          <p className="text-gray-600">
            {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando seu primeiro lembrete'}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLembrete ? 'Editar Lembrete' : 'Novo Lembrete'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo || ''}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título do lembrete"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    rows={3}
                    value={formData.descricao || ''}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrição detalhada do lembrete..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Lembrete *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data_lembrete || ''}
                    onChange={(e) => setFormData({ ...formData, data_lembrete: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora do Lembrete (opcional)
                  </label>
                  <input
                    type="time"
                    value={formData.hora_lembrete || ''}
                    onChange={(e) => setFormData({ ...formData, hora_lembrete: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para lembrete apenas por data
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingLembrete ? 'Atualizar' : 'Criar'} Lembrete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Reminder Modal */}
      {viewingLembrete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalhes do Lembrete
                </h2>
                <button
                  onClick={() => setViewingLembrete(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Título</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingLembrete.titulo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(viewingLembrete.status)}`}>
                      {getStatusLabel(viewingLembrete.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Data do Lembrete</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(viewingLembrete.data_lembrete)}</p>
                  {isToday(viewingLembrete.data_lembrete) && (
                    <p className="text-sm text-blue-600 font-medium">📅 Hoje</p>
                  )}
                  {isOverdue(viewingLembrete.data_lembrete, viewingLembrete.status) && (
                    <p className="text-sm text-red-600 font-medium">⚠️ Vencido há {Math.abs(getDaysUntil(viewingLembrete.data_lembrete))} dias</p>
                  )}
                </div>
                {viewingLembrete.hora_lembrete && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Hora</label>
                    <p className="text-lg font-semibold text-gray-900">{viewingLembrete.hora_lembrete}</p>
                  </div>
                )}
              </div>

              {viewingLembrete.descricao && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Descrição</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingLembrete.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Criado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingLembrete.criado_em).toLocaleDateString('pt-BR')} às {new Date(viewingLembrete.criado_em).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Atualizado em</label>
                  <p className="text-sm text-gray-900">
                    {new Date(viewingLembrete.atualizado_em).toLocaleDateString('pt-BR')} às {new Date(viewingLembrete.atualizado_em).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              {viewingLembrete.status === 'pendente' && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        handleStatusChange(viewingLembrete.id, 'concluido');
                        setViewingLembrete(null);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Marcar como Concluído
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(viewingLembrete.id, 'cancelado');
                        setViewingLembrete(null);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Bell className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">💡 Sobre as Visualizações</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Cards:</strong> Visualização em lista com filtros avançados e busca</p>
              <p>• <strong>Calendário:</strong> Visualização mensal com eventos organizados por data</p>
              <p>• Clique em qualquer lembrete para ver detalhes completos</p>
              <p>• Use as ações rápidas para marcar como concluído ou cancelar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemindersManager;