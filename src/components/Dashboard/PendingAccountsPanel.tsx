```typescript
// src/components/Dashboard/PendingAccountsPanel.tsx
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
  }, [dateFilter, profile]); // Re-fetch when dateFilter or profile changes

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando contas pendentes...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <MetricCard
        title="Contas a Receber Pendentes"
        value={formatCurrency(pendingReceivables)}
        icon={DollarSign}
        color="orange"
        changeType="neutral" // No change calculation for this card
      />
      <MetricCard
        title="Contas a Pagar Pendentes"
        value={formatCurrency(pendingPayables)}
        icon={Clock}
        color="red"
        changeType="neutral" // No change calculation for this card
      />
    </div>
  );
};

export default PendingAccountsPanel;
```