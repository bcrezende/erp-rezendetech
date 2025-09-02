import React, { useMemo, useState } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { Database } from '../../types/supabase';

type Transaction = Database['public']['Tables']['transacoes']['Row'];
type Category = Database['public']['Tables']['categorias']['Row'];
type Venda = Database['public']['Tables']['vendas']['Row'];
type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface DREPanelProps {
  dateFilter: {
    startDate: string;
    endDate: string;
  };
}
interface DREData {
  period: string;
  receitaBruta: number;
  despesaOperacional: number;
  margemContribuicao: number;
  custoFixo: number;
  resultadoNegocio: number;
  debug: {
    totalTransactions: number;
    filteredTransactionsCount: number;
    totalVendas: number;
    filteredVendasCount: number;
    receitaVendasValue: number;
    receitasTransacoesCount: number;
    despesasOperacionaisCount: number;
    custosFixosCount: number;
  };
  detalhes: {
    receitas: Array<{ categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>;
    despesasOperacionais: Array<{ categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>;
    custosFixos: Array<{ categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>;
  };
}

const DREPanel: React.FC<DREPanelProps> = ({ dateFilter }) => {
  const { supabase, profile } = useAuth();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [vendas, setVendas] = React.useState<Venda[]>([]);
  const [pessoas, setPessoas] = React.useState<Pessoa[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  React.useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      if (!profile?.id || !profile?.id_empresa) {
        setTransactions([]);
        setCategories([]);
        setVendas([]);
        setPessoas([]);
        return;
      }

      const [transactionsRes, categoriesRes, vendasRes, pessoasRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('status', ['concluida', 'pago', 'recebido', 'concluída'])
          .gte('data_transacao', dateFilter.startDate)
          .lte('data_transacao', dateFilter.endDate),
        supabase
          .from('categorias')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true),
        supabase
          .from('vendas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .in('status', ['confirmed', 'delivered'])
          .eq('ativo', true)
          .gte('data_venda', dateFilter.startDate)
          .lte('data_venda', dateFilter.endDate),
        supabase
          .from('pessoas')
          .select('*')
          .eq('id_empresa', profile.id_empresa)
          .eq('ativo', true)
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (vendasRes.error) throw vendasRes.error;
      if (pessoasRes.error) throw pessoasRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
      setVendas(vendasRes.data || []);
      setPessoas(pessoasRes.data || []);
    } catch (error) {
      console.error('Error loading DRE data:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getCategoryName = (id: string | null) => {
    if (!id) return null;
    const category = categories.find(c => c.id === id);
    return category?.nome || null;
  };

  const getPessoaName = (id: string | null) => {
    if (!id) return null;
    const pessoa = pessoas.find(p => p.id === id);
    return pessoa?.nome_razao_social || null;
  };

  const formatDateFromString = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };
  const dreData = useMemo((): DREData => {
    // As transações e vendas já vêm filtradas pela data do useEffect
    const filteredTransactions = transactions;
    const filteredVendas = vendas;

    // RECEITA BRUTA = Vendas + Contas a Receber (pagas/recebidas)
    const receitaVendas = filteredVendas.reduce((sum, v) => sum + v.total, 0);
    const receitasTransacoes = filteredTransactions.filter(t => t.tipo === 'receita');
    
    // Agrupar receitas por categoria
    const receitasPorCategoria = new Map<string, { categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>();
    
    // Adicionar vendas como "Vendas de Produtos/Serviços"
    if (receitaVendas > 0) {
      receitasPorCategoria.set('vendas', {
        categoria: 'Vendas de Produtos/Serviços',
        valor: receitaVendas,
        itens: filteredVendas.map(v => ({
          descricao: `Venda #${v.id_sequencial}`,
          valor: v.total,
          data: v.data_venda
        }))
      });
    }

    // Adicionar transações de receita
    receitasTransacoes.forEach(t => {
      const categoryName = getCategoryName(t.id_categoria) || 'Outras Receitas';
      const key = t.id_categoria || 'outras';
      
      if (!receitasPorCategoria.has(key)) {
        receitasPorCategoria.set(key, {
          categoria: categoryName,
          valor: 0,
          itens: []
        });
      }
      
      const categoria = receitasPorCategoria.get(key)!;
      categoria.valor += t.valor;
      categoria.itens.push({
        descricao: t.descricao,
        valor: t.valor,
        data: t.data_transacao
      });
    });

    const receitaBruta = Array.from(receitasPorCategoria.values()).reduce((sum, cat) => sum + cat.valor, 0);

    // DESPESAS OPERACIONAIS = Despesas classificadas como operacionais (pagas)
    const despesasOperacionais = filteredTransactions.filter(t => {
      if (t.tipo !== 'despesa') return false;
      
      if (t.id_categoria) {
        const categoria = categories.find(c => c.id === t.id_categoria);
        return !categoria?.classificacao_dre || categoria.classificacao_dre === 'despesa_operacional';
      }
      
      return true; // Se não tem categoria, considera operacional
    });

    // Agrupar despesas operacionais por categoria
    const despesasOperacionaisPorCategoria = new Map<string, { categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>();
    
    despesasOperacionais.forEach(t => {
      const categoryName = getCategoryName(t.id_categoria) || 'Despesas Operacionais Gerais';
      const key = t.id_categoria || 'gerais';
      
      if (!despesasOperacionaisPorCategoria.has(key)) {
        despesasOperacionaisPorCategoria.set(key, {
          categoria: categoryName,
          valor: 0,
          itens: []
        });
      }
      
      const categoria = despesasOperacionaisPorCategoria.get(key)!;
      categoria.valor += t.valor;
      categoria.itens.push({
        descricao: `${t.descricao}${getPessoaName(t.id_pessoa) ? ` - ${getPessoaName(t.id_pessoa)}` : ''}`,
        valor: t.valor,
        data: t.data_transacao
      });
    });

    const despesaOperacional = Array.from(despesasOperacionaisPorCategoria.values()).reduce((sum, cat) => sum + cat.valor, 0);

    // MARGEM DE CONTRIBUIÇÃO
    const margemContribuicao = receitaBruta - despesaOperacional;

    // CUSTOS FIXOS = Despesas classificadas como custo fixo (pagas)
    const custosFixos = filteredTransactions.filter(t => {
      if (t.tipo !== 'despesa') return false;
      
      if (t.id_categoria) {
        const categoria = categories.find(c => c.id === t.id_categoria);
        return categoria?.classificacao_dre === 'custo_fixo';
      }
      
      return false;
    });

    // Agrupar custos fixos por categoria
    const custosFixosPorCategoria = new Map<string, { categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>();
    
    custosFixos.forEach(t => {
      const categoryName = getCategoryName(t.id_categoria) || 'Custos Fixos Gerais';
      const key = t.id_categoria || 'gerais';
      
      if (!custosFixosPorCategoria.has(key)) {
        custosFixosPorCategoria.set(key, {
          categoria: categoryName,
          valor: 0,
          itens: []
        });
      }
      
      const categoria = custosFixosPorCategoria.get(key)!;
      categoria.valor += t.valor;
      categoria.itens.push({
        descricao: `${t.descricao}${getPessoaName(t.id_pessoa) ? ` - ${getPessoaName(t.id_pessoa)}` : ''}`,
        valor: t.valor,
        data: t.data_transacao
      });
    });

    const custoFixo = Array.from(custosFixosPorCategoria.values()).reduce((sum, cat) => sum + cat.valor, 0);

    // RESULTADO DO NEGÓCIO
    const resultadoNegocio = margemContribuicao - custoFixo;

    return {
      period: `${formatDateFromString(dateFilter.startDate)} - ${formatDateFromString(dateFilter.endDate)}`,
      receitaBruta,
      despesaOperacional,
      margemContribuicao,
      custoFixo,
      resultadoNegocio,
      debug: {
        totalTransactions: transactions.length,
        filteredTransactionsCount: filteredTransactions.length,
        totalVendas: vendas.length,
        filteredVendasCount: filteredVendas.length,
        receitaVendasValue: receitaVendas,
        receitasTransacoesCount: receitasTransacoes.length,
        despesasOperacionaisCount: despesasOperacionais.length,
        custosFixosCount: custosFixos.length
      },
      detalhes: {
        receitas: Array.from(receitasPorCategoria.values()),
        despesasOperacionais: Array.from(despesasOperacionaisPorCategoria.values()),
        custosFixos: Array.from(custosFixosPorCategoria.values())
      }
    };
  }, [transactions, categories, vendas, pessoas, dateFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('pt-BR');
  };

  const renderExpandableSection = (
    id: string,
    title: string,
    value: number,
    isExpense: boolean,
    detalhes: Array<{ categoria: string; valor: number; itens: Array<{ descricao: string; valor: number; data: string }> }>,
    description: string
  ) => {
    const isExpanded = expandedSections.includes(id);
    
    return (
      <div className="border-2 border-white/40 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden glass-strong hover-lift interactive-card">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-gradient-to-r hover:from-white/20 hover:to-slate-50/20 transition-smooth group touch-target no-select"
        >
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl transition-all duration-300 shadow-lg ${
              isExpanded ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-white/80 text-gray-600 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600 group-hover:text-white'
            }`}>
              {isExpanded ? <ChevronDown size={16} className="sm:w-[18px] sm:h-[18px]" /> : <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className="font-black text-gray-900 text-sm sm:text-lg tracking-wide block truncate">{title}</span>
              <p className="text-xs text-gray-600 mt-1 font-semibold tracking-wide hidden sm:block">{description}</p>
            </div>
          </div>
          <span className={`font-black text-base sm:text-2xl ${
            isExpense ? 'text-red-600' : 
            value < 0 ? 'text-red-600' : 'text-green-600'
          } drop-shadow-lg tracking-tight flex-shrink-0 ml-2`}>
            {isExpense ? '-' : ''}{formatCurrency(Math.abs(value))}
          </span>
        </button>

        {isExpanded && detalhes.length > 0 && (
          <div className="border-t border-white/30 bg-gradient-to-r from-white/40 to-slate-50/40 backdrop-blur-sm animate-slide-in-up max-h-60 sm:max-h-80 overflow-y-auto mobile-scroll">
            {detalhes.map((categoria, catIndex) => (
              <div key={catIndex} className="border-b border-white/20 last:border-b-0 animate-fade-in hover:bg-white/20 transition-smooth sticky top-0 z-10">
                <div className="p-3 sm:p-4 bg-gradient-to-r from-white/30 to-slate-100/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900 tracking-wide text-sm sm:text-base truncate flex-1 mr-2">{categoria.categoria}</span>
                    <span className={`font-black text-base sm:text-lg ${isExpense ? 'text-red-600' : 'text-green-600'} drop-shadow-lg flex-shrink-0`}>
                      {formatCurrency(categoria.valor)}
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-3">
                  {categoria.itens.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm hover:bg-white/60 rounded-xl transition-smooth hover:shadow-lg hover-lift touch-target">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="text-gray-900 font-bold block truncate">{item.descricao}</span>
                        <span className="text-gray-600 text-xs font-semibold">({formatDate(item.data)})</span>
                      </div>
                      <span className={`font-black ${isExpense ? 'text-red-600' : 'text-green-600'} drop-shadow-lg flex-shrink-0 text-sm sm:text-base`}>
                        {formatCurrency(item.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && detalhes.length === 0 && (
          <div className="border-t border-white/30 bg-gradient-to-r from-white/40 to-slate-50/40 p-4 sm:p-6 text-center text-gray-600 animate-fade-in font-semibold text-sm sm:text-base">
            Nenhum lançamento encontrado nesta categoria
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-premium rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 p-4 sm:p-6 lg:p-8 hover-lift relative overflow-hidden animate-slide-in-from-left">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-purple-50/40 to-pink-50/60 rounded-2xl sm:rounded-3xl" />
      
      {/* Floating elements */}
      <div className="absolute top-6 right-6 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-6 left-6 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3 relative z-10 min-w-0">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 rounded-xl sm:rounded-2xl shadow-xl hover-glow animate-scale-in">
            <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-base sm:text-lg lg:text-xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent tracking-tight truncate">
            Demonstrativo do Resultado do Exercício (DRE)
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-right relative z-10 glass rounded-lg sm:rounded-xl px-2 sm:px-3 lg:px-4 py-1 sm:py-2 font-semibold animate-slide-in-from-right">
          Período: {dreData.period}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 relative z-10">
        {/* RECEITA BRUTA */}
        {renderExpandableSection(
          'receita-bruta',
          'RECEITA BRUTA',
          dreData.receitaBruta,
          false,
          dreData.detalhes.receitas,
          'Vendas confirmadas/entregues + Contas a receber (pagas/recebidas)'
        )}

        {/* DESPESA OPERACIONAL */}
        {renderExpandableSection(
          'despesa-operacional',
          'DESPESA OPERACIONAL',
          dreData.despesaOperacional,
          true,
          dreData.detalhes.despesasOperacionais,
          'Despesas classificadas como operacionais (pagas)'
        )}

        {/* MARGEM DE CONTRIBUIÇÃO */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover-lift relative overflow-hidden animate-scale-in touch-target">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-2xl animate-float" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <div className="relative z-10">
              <span className="font-black text-blue-900 text-base sm:text-xl tracking-wide">MARGEM DE CONTRIBUIÇÃO</span>
              <p className="text-xs sm:text-sm text-blue-800 mt-1 sm:mt-2 font-bold tracking-wide">Receita Bruta - Despesa Operacional</p>
            </div>
            <span className={`font-black text-xl sm:text-3xl ${
              dreData.margemContribuicao >= 0 ? 'text-blue-900' : 'text-red-600'
            } drop-shadow-xl tracking-tight text-right sm:text-left`}>
              {formatCurrency(dreData.margemContribuicao)}
            </span>
          </div>
        </div>

        {/* CUSTO FIXO */}
        {renderExpandableSection(
          'custo-fixo',
          'CUSTO FIXO',
          dreData.custoFixo,
          true,
          dreData.detalhes.custosFixos,
          'Despesas classificadas como custo fixo (pagas)'
        )}

        {/* RESULTADO DO NEGÓCIO */}
        <div className={`border-3 rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden hover-lift animate-scale-in touch-target ${
          dreData.resultadoNegocio >= 0 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' 
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
        }`}>
          <div className={`absolute inset-0 ${
            dreData.resultadoNegocio >= 0 
              ? 'bg-gradient-to-r from-green-600/10 to-emerald-600/10' 
              : 'bg-gradient-to-r from-red-600/10 to-pink-600/10'
          }`} />
          <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl animate-float ${
            dreData.resultadoNegocio >= 0 
              ? 'bg-gradient-to-br from-green-400/20 to-emerald-400/20' 
              : 'bg-gradient-to-br from-red-400/20 to-pink-400/20'
          }`} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <div className="relative z-10">
              <span className={`font-black text-2xl ${
                dreData.resultadoNegocio >= 0 ? 'text-green-900' : 'text-red-900'
              } tracking-wide text-base sm:text-2xl`}>
                RESULTADO DO NEGÓCIO
              </span>
              <p className={`text-sm mt-2 ${
                dreData.resultadoNegocio >= 0 ? 'text-green-700' : 'text-red-700'
              } font-bold tracking-wide text-xs sm:text-sm`}>
                Margem de Contribuição - Custo Fixo
              </p>
            </div>
            <span className={`font-black text-2xl sm:text-4xl ${
              dreData.resultadoNegocio >= 0 ? 'text-green-900' : 'text-red-900'
            } drop-shadow-2xl relative z-10 tracking-tight text-right sm:text-left`}>
              {formatCurrency(dreData.resultadoNegocio)}
            </span>
          </div>
        </div>
      </div>

      {/* Análise Percentual */}
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-white/60 to-slate-50/60 rounded-xl sm:rounded-2xl shadow-inner relative z-10 backdrop-blur-sm border border-white/30 animate-slide-in-up">
        <h4 className="font-black text-gray-900 mb-3 sm:mb-4 tracking-wide text-base sm:text-lg">📊 Análise Percentual</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-bold">Margem de Contribuição:</span>
            <span className="font-black text-blue-600 text-sm sm:text-base">
              {dreData.receitaBruta > 0 ? ((dreData.margemContribuicao / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-bold">Margem Líquida:</span>
            <span className="font-black text-green-600 text-sm sm:text-base">
              {dreData.receitaBruta > 0 ? ((dreData.resultadoNegocio / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-bold">Despesas/Receita:</span>
            <span className="font-black text-orange-600 text-sm sm:text-base">
              {dreData.receitaBruta > 0 ? ((dreData.despesaOperacional / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-bold">Custos Fixos/Receita:</span>
            <span className="font-black text-red-600 text-sm sm:text-base">
              {dreData.receitaBruta > 0 ? ((dreData.custoFixo / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DREPanel;