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
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <div className="text-left">
              <span className="font-bold text-gray-900 text-base">{title}</span>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
          </div>
          <span className={`font-bold text-lg ${
            isExpense ? 'text-red-600' : 
            value < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {isExpense ? '-' : ''}{formatCurrency(Math.abs(value))}
          </span>
        </button>

        {isExpanded && detalhes.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50">
            {detalhes.map((categoria, catIndex) => (
              <div key={catIndex} className="border-b border-gray-100 last:border-b-0">
                <div className="p-3 bg-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{categoria.categoria}</span>
                    <span className={`font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(categoria.valor)}
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  {categoria.itens.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between py-2 px-3 text-sm hover:bg-gray-100 rounded">
                      <div>
                        <span className="text-gray-900">{item.descricao}</span>
                        <span className="text-gray-500 ml-2">({formatDate(item.data)})</span>
                      </div>
                      <span className={`font-medium ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
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
          <div className="border-t border-gray-200 bg-gray-50 p-4 text-center text-gray-500">
            Nenhum lançamento encontrado nesta categoria
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Demonstrativo do Resultado do Exercício (DRE)
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 text-right">
          Período: {dreData.period}
        </div>
      </div>

      <div className="space-y-4">
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
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-blue-900 text-lg">MARGEM DE CONTRIBUIÇÃO</span>
              <p className="text-xs text-blue-700 mt-1">Receita Bruta - Despesa Operacional</p>
            </div>
            <span className={`font-bold text-xl ${
              dreData.margemContribuicao >= 0 ? 'text-blue-900' : 'text-red-600'
            }`}>
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
        <div className={`border-2 rounded-lg p-4 ${
          dreData.resultadoNegocio >= 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`font-bold text-xl ${
                dreData.resultadoNegocio >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                RESULTADO DO NEGÓCIO
              </span>
              <p className={`text-xs mt-1 ${
                dreData.resultadoNegocio >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                Margem de Contribuição - Custo Fixo
              </p>
            </div>
            <span className={`font-bold text-2xl ${
              dreData.resultadoNegocio >= 0 ? 'text-green-900' : 'text-red-900'
            }`}>
              {formatCurrency(dreData.resultadoNegocio)}
            </span>
          </div>
        </div>
      </div>

      {/* Análise Percentual */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Análise Percentual</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Margem de Contribuição:</span>
            <span className="font-semibold">
              {dreData.receitaBruta > 0 ? ((dreData.margemContribuicao / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Margem Líquida:</span>
            <span className="font-semibold">
              {dreData.receitaBruta > 0 ? ((dreData.resultadoNegocio / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Despesas/Receita:</span>
            <span className="font-semibold">
              {dreData.receitaBruta > 0 ? ((dreData.despesaOperacional / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Custos Fixos/Receita:</span>
            <span className="font-semibold">
              {dreData.receitaBruta > 0 ? ((dreData.custoFixo / dreData.receitaBruta) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DREPanel;