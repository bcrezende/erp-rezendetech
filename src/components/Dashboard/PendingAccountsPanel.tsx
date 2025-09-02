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
    <div className="card-premium rounded-xl lg:rounded-2xl shadow-xl border border-white/30 p-4 lg:p-6 hover-lift relative overflow-hidden animate-slide-in-up">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/60 via-orange-50/40 to-red-50/60 rounded-xl lg:rounded-2xl" />
      
      {/* Floating elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-orange-400/10 to-red-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="flex items-center space-x-3 mb-6 relative z-10">
        <div className="p-3 bg-gradient-to-br from-yellow-500 via-orange-600 to-red-600 rounded-2xl shadow-xl hover-glow animate-scale-in">
          <Clock className="h-6 w-6 text-white drop-shadow-lg" />
        </div>
        <div>
          <h3 className="text-lg lg:text-xl font-black bg-gradient-to-r from-gray-900 via-yellow-900 to-orange-900 bg-clip-text text-transparent tracking-tight">
            Contas Pendentes
          </h3>
          <p className="text-sm text-gray-700 font-bold tracking-wide">
            Valores aguardando pagamento/recebimento
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 relative z-10">
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift animate-scale-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base font-black text-orange-800 tracking-wider uppercase">
                A Receber
              </p>
              <p className="text-2xl lg:text-3xl font-black text-orange-900 tracking-tight drop-shadow-lg">
                {formatCurrency(pendingReceivables)}
              </p>
              <p className="text-xs lg:text-sm text-orange-700 font-bold mt-1">
                Valores pendentes de clientes
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl shadow-xl hover-glow">
              <DollarSign className="text-white drop-shadow-lg" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift animate-scale-in stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base font-black text-red-800 tracking-wider uppercase">
                A Pagar
              </p>
              <p className="text-2xl lg:text-3xl font-black text-red-900 tracking-tight drop-shadow-lg">
                {formatCurrency(pendingPayables)}
              </p>
              <p className="text-xs lg:text-sm text-red-700 font-bold mt-1">
                Valores pendentes para fornecedores
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-xl hover-glow">
              <Clock className="text-white drop-shadow-lg" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Total */}
      <div className="mt-6 p-4 lg:p-6 glass rounded-xl lg:rounded-2xl shadow-xl border border-white/30 relative z-10 animate-slide-in-up">
        <div className="flex items-center justify-between">
          <span className="text-sm lg:text-base font-black text-gray-900 tracking-wide">
            Saldo Pendente (A Receber - A Pagar):
          </span>
          <span className={`text-xl lg:text-2xl font-black tracking-tight drop-shadow-lg ${
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