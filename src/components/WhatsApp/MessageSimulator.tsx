import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { MessageCircle, Send, Mic, Image, CheckCircle, AlertCircle } from 'lucide-react';
import { WhatsAppMessage, Transaction } from '../../types';

const MessageSimulator: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const simulateMessageProcessing = async (content: string): Promise<Partial<Transaction> | null> => {
    // Simula o processamento da IA para extrair dados
    await new Promise(resolve => setTimeout(resolve, 2000));

    const lowerContent = content.toLowerCase();
    
    // Padrões simples para demonstração
    if (lowerContent.includes('comprei') || lowerContent.includes('paguei') || lowerContent.includes('gasto')) {
      const amount = extractAmount(content);
      return {
        type: 'expense',
        category: extractCategory(content, 'expense'),
        description: content,
        amount: amount || 0,
        date: new Date(),
        accountId: state.accounts[0]?.id || '1',
        status: 'completed'
      };
    }
    
    if (lowerContent.includes('vendi') || lowerContent.includes('recebi') || lowerContent.includes('faturei')) {
      const amount = extractAmount(content);
      return {
        type: 'income',
        category: extractCategory(content, 'income'),
        description: content,
        amount: amount || 0,
        date: new Date(),
        accountId: state.accounts[0]?.id || '1',
        status: 'completed'
      };
    }

    return null;
  };

  const extractAmount = (text: string): number | null => {
    const patterns = [
      /r?\$?\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
      /(\d+(?:\.\d{3})*(?:,\d{2})?)\s?reais?/gi,
      /(\d+(?:,\d{2})?)\s?(?:reais?|r\$)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[0]
          .replace(/[^\d,]/g, '')
          .replace(',', '.');
        return parseFloat(value);
      }
    }
    return null;
  };

  const extractCategory = (text: string, type: 'income' | 'expense'): string => {
    const expenseCategories = {
      'material': ['material', 'escritório', 'suprimento'],
      'alimentação': ['almoço', 'jantar', 'comida', 'restaurante'],
      'transporte': ['uber', 'taxi', 'combustível', 'gasolina'],
      'fornecedor': ['fornecedor', 'compra'],
      'administrativo': ['conta', 'serviço', 'taxa']
    };

    const incomeCategories = {
      'vendas': ['venda', 'produto', 'cliente'],
      'serviços': ['serviço', 'consultoria', 'trabalho'],
      'outros': ['recebimento', 'pagamento']
    };

    const categories = type === 'expense' ? expenseCategories : incomeCategories;
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    
    return type === 'expense' ? 'outros' : 'vendas';
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsProcessing(true);

    const newMessage: WhatsAppMessage = {
      id: Date.now().toString(),
      content: message,
      type: 'text',
      processed: false,
      timestamp: new Date()
    };

    dispatch({ type: 'ADD_WHATSAPP_MESSAGE', payload: newMessage });

    try {
      const extractedData = await simulateMessageProcessing(message);
      
      if (extractedData) {
        const transaction: Transaction = {
          id: Date.now().toString(),
          type: extractedData.type!,
          category: extractedData.category!,
          description: extractedData.description!,
          amount: extractedData.amount!,
          date: extractedData.date!,
          accountId: extractedData.accountId!,
          status: extractedData.status!,
          createdAt: new Date(),
          origem: 'whatsapp_ia'
        };

        dispatch({ type: 'ADD_TRANSACTION', payload: transaction });

        // Atualiza a mensagem como processada
        const updatedMessage = {
          ...newMessage,
          processed: true,
          extractedData
        };
        
        // Simula confirmação via WhatsApp
        setTimeout(() => {
          const confirmationMessage: WhatsAppMessage = {
            id: (Date.now() + 1).toString(),
            content: `✅ Lançamento realizado com sucesso!\n\n💰 ${extractedData.type === 'income' ? 'Receita' : 'Despesa'}: R$ ${extractedData.amount?.toFixed(2)}\n📝 Descrição: ${extractedData.description}\n🏷️ Categoria: ${extractedData.category}`,
            type: 'text',
            processed: true,
            timestamp: new Date()
          };
          dispatch({ type: 'ADD_WHATSAPP_MESSAGE', payload: confirmationMessage });
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }

    setMessage('');
    setIsProcessing(false);
  };

  const sampleMessages = [
    "Comprei material de escritório por R$ 350,00",
    "Recebi pagamento do cliente ABC no valor de R$ 5.200,00",
    "Paguei R$ 890,50 de energia elétrica",
    "Vendi produtos online por R$ 2.400,00",
    "Gasto com almoço de negócios: R$ 180,00"
  ];

  return (
    <div className="space-y-6">
      {/* Painel de Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Status do Agente WhatsApp
        </h3>
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-600">Conectado e Ativo</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          O agente está pronto para receber e processar mensagens automaticamente
        </p>
      </div>

      {/* Simulador de Chat */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-600 text-white p-4">
          <div className="flex items-center space-x-3">
            <MessageCircle size={24} />
            <div>
              <h3 className="font-semibold">Agente ERP WhatsApp</h3>
              <p className="text-sm text-green-100">Simulador de Integração</p>
            </div>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {state.whatsappMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Envie uma mensagem para testar o agente IA</p>
            </div>
          ) : (
            state.whatsappMessages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-green-500 text-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">{msg.content}</p>
                    <div className="flex items-center justify-end mt-1 space-x-1">
                      <span className="text-xs text-green-100">
                        {msg.timestamp.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {msg.processed ? (
                        <CheckCircle size={12} className="text-green-100" />
                      ) : (
                        <AlertCircle size={12} className="text-yellow-200" />
                      )}
                    </div>
                  </div>
                </div>

                {msg.processed && msg.extractedData && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-xs">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          Lançamento Processado
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Tipo:</strong> {msg.extractedData.type === 'income' ? 'Receita' : 'Despesa'}</p>
                        <p><strong>Valor:</strong> R$ {msg.extractedData.amount?.toFixed(2)}</p>
                        <p><strong>Categoria:</strong> {msg.extractedData.category}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex justify-center">
              <div className="bg-gray-300 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">Processando mensagem...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite uma mensagem para simular..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <Image size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <Mic size={20} />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isProcessing}
              className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens de Exemplo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mensagens de Exemplo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sampleMessages.map((sampleMsg, index) => (
            <button
              key={index}
              onClick={() => setMessage(sampleMsg)}
              className="text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              {sampleMsg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageSimulator;