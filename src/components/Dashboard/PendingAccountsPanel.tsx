import React, { useEffect, useState } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import MetricCard from './MetricCard';
import { Clock, DollarSign } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];

interface PendingAccountsPanelProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}

const PendingAccountsPanel: React.FC<PendingAccountsPanelProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const [pendingReceivables, setPendingReceivables] = useState(0);
  const [pendingPayables, setPendingPayables] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingAccounts();
  }, [dateFilter, profile]);

  const loadPendingAccounts = async () => {
    setLoading(true);
    try {
      if (!profile?.id_empresa) {
        setPendingReceivables(0);
        setPendingPayables(0);
        setLoading(false);
        return;
      }

      // Fetch pending receivables
      const { data: receivablesData, error: receivablesError } = await supabase
        .from('transacoes')
        .select('valor')
        .eq('id_empresa', profile.id_empresa)
        .eq('tipo', 'receita')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateFilter.startDate)
        .lte('data_vencimento', dateFilter.endDate);

      if (receivablesError) throw receivablesError;

      const totalReceivables = (receivablesData || []).reduce((sum, t) => sum + t.valor, 0);
      setPendingReceivables(totalReceivables);

      // Fetch pending payables
      const { data: payablesData, error: payablesError } = await supabase
        .from('transacoes')
        .select('valor')
        .eq('id_empresa', profile.id_empresa)
        .eq('tipo', 'despesa')
        .eq('status', 'pendente')
        .gte('data_vencimento', dateFilter.startDate)
        .lte('data_vencimento', dateFilter.endDate);

      if (payablesError) throw payablesError;

      const totalPayables = (payablesData || []).reduce((sum, t) => sum + t.valor, 0);
      setPendingPayables(totalPayables);

    } catch (error) {
      console.error('Error loading pending accounts:', error);
      setPendingReceivables(0);
      setPendingPayables(0);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="card-premium rounded-xl lg:rounded-2xl shadow-xl border border-white/30 p-4 lg:p-6 flex items-center justify-center h-32 lg:h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando contas pendentes...</p>
      </div>
    );
  }

  return (
    <div className="card-premium rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-6 lg:p-8 hover-lift relative overflow-hidden animate-slide-in-up">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/60 via-orange-50/40 to-red-50/60 rounded-2xl sm:rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 min-w-0">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-yellow-500 via-orange-600 to-red-600 rounded-xl sm:rounded-2xl shadow-xl hover-glow animate-scale-in">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white drop-shadow-lg" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-black bg-gradient-to-r from-gray-900 via-yellow-900 to-orange-900 bg-clip-text text-transparent tracking-tight truncate">
              Contas Pendentes
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 font-bold tracking-wide">
              Valores aguardando pagamento/recebimento
            </p>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-right relative z-10 glass rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-2 font-semibold animate-slide-in-from-right">
          Período Atual
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative z-10">
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift animate-scale-in">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm lg:text-base font-black text-orange-800 tracking-wider uppercase truncate">
                A Receber
              </p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-black text-orange-900 tracking-tight drop-shadow-lg break-all">
                {formatCurrency(pendingReceivables)}
              </p>
              <p className="text-xs sm:text-sm text-orange-700 font-bold mt-1">
                Valores pendentes de clientes
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl shadow-xl hover-glow flex-shrink-0">
              <DollarSign className="text-white drop-shadow-lg" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift animate-scale-in stagger-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm lg:text-base font-black text-red-800 tracking-wider uppercase truncate">
                A Pagar
              </p>
              <p className="text-lg sm:text-2xl lg:text-3xl font-black text-red-900 tracking-tight drop-shadow-lg break-all">
                {formatCurrency(pendingPayables)}
              </p>
              <p className="text-xs sm:text-sm text-red-700 font-bold mt-1">
                Valores pendentes para fornecedores
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-xl hover-glow flex-shrink-0">
              <Clock className="text-white drop-shadow-lg" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Total */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 lg:p-6 glass rounded-xl sm:rounded-2xl shadow-xl border border-white/30 relative z-10 animate-slide-in-up">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm lg:text-base font-black text-gray-900 tracking-wide truncate flex-1 mr-2">
            Saldo Pendente (A Receber - A Pagar):
          </span>
          <span className={`text-base sm:text-xl lg:text-2xl font-black tracking-tight drop-shadow-lg flex-shrink-0 ${
            (pendingReceivables - pendingPayables) >= 0 ? 'text-blue-600' : 'text-orange-600'
          }`}>
            {formatCurrency(pendingReceivables - pendingPayables)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PendingAccountsPanel;