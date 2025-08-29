import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  Image, 
  CheckCircle, 
  AlertCircle, 
  Bot,
  User,
  MicOff,
  Camera,
  Upload,
  X
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  messageType: 'text' | 'audio' | 'image';
  timestamp: Date;
  status: 'sending' | 'sent' | 'processed' | 'error';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    audioUrl?: string;
    imageUrl?: string;
  };
}

const ChatInterface: React.FC = () => {
  const { supabase, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Adicionar mensagem de boas-vindas
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: 'Olá! Sou seu assistente financeiro inteligente. Posso ajudar você a:\n\n• Registrar receitas e despesas\n• Consultar saldo e fluxo de caixa\n• Analisar indicadores financeiros\n• Responder perguntas sobre suas finanças\n\nComo posso ajudar você hoje?',
      type: 'assistant',
      messageType: 'text',
      timestamp: new Date(),
      status: 'processed'
    };
    setMessages([welcomeMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string, messageType: 'text' | 'audio' | 'image', metadata?: any) => {
    if (!content.trim() && messageType === 'text') return;
    if (!profile?.id_empresa) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      type: 'user',
      messageType,
      timestamp: new Date(),
      status: 'sending',
      metadata
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Atualizar status para enviado
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
      ));

      // Chamar edge function para processar mensagem
      const { data, error } = await supabase.functions.invoke('process-chat-message', {
        body: {
          message: content,
          messageType,
          metadata,
          empresaId: profile.id_empresa,
          userId: profile.id
        }
      });

      if (error) throw error;

      // Atualizar status para processado
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'processed' } : msg
      ));

      // Adicionar resposta do assistente
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || 'Desculpe, não consegui processar sua mensagem.',
        type: 'assistant',
        messageType: 'text',
        timestamp: new Date(),
        status: 'processed'
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Marcar mensagem como erro
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
      ));

      // Adicionar mensagem de erro
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        type: 'assistant',
        messageType: 'text',
        timestamp: new Date(),
        status: 'processed'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText, 'text');
      setInputText('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendMessage(base64Audio, 'audio', {
            fileName: `audio_${Date.now()}.wav`,
            fileSize: audioBlob.size
          });
        };
        
        reader.readAsDataURL(audioBlob);
        setAudioChunks([]);
      };
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('A imagem deve ter no máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      sendMessage(base64Image, 'image', {
        fileName: file.name,
        fileSize: file.size,
        imageUrl: base64Image
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />;
      case 'sent':
        return <CheckCircle size={12} className="text-gray-400" />;
      case 'processed':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={12} className="text-red-500" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.messageType === 'image' && message.metadata?.imageUrl) {
      return (
        <div className="space-y-2">
          <img 
            src={message.metadata.imageUrl} 
            alt="Imagem enviada"
            className="max-w-xs rounded-lg shadow-sm"
          />
          <p className="text-sm text-gray-600">
            📷 {message.metadata.fileName}
          </p>
        </div>
      );
    }

    if (message.messageType === 'audio' && message.metadata?.audioUrl) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
            <Mic size={16} className="text-gray-600" />
            <span className="text-sm text-gray-600">Mensagem de áudio</span>
          </div>
          <audio controls className="w-full max-w-xs">
            <source src={message.metadata.audioUrl} type="audio/wav" />
          </audio>
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap">
        {message.content}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white bg-opacity-20 rounded-full">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-semibold">Assistente Financeiro IA</h3>
            <p className="text-sm text-blue-100">
              {isProcessing ? 'Processando...' : 'Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg' 
                : 'bg-white text-gray-900 rounded-r-lg rounded-tl-lg shadow-sm border border-gray-200'
            } p-3`}>
              {message.type === 'assistant' && (
                <div className="flex items-center space-x-2 mb-2">
                  <Bot size={16} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Assistente IA</span>
                </div>
              )}
              
              <div className="text-sm">
                {renderMessageContent(message)}
              </div>
              
              <div className={`flex items-center justify-end space-x-1 mt-2 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                <span className="text-xs">
                  {formatTime(message.timestamp)}
                </span>
                {message.type === 'user' && getMessageStatusIcon(message.status)}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-r-lg rounded-tl-lg shadow-sm border border-gray-200 p-3 max-w-xs">
              <div className="flex items-center space-x-2">
                <Bot size={16} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Assistente IA</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-gray-600">Analisando mensagem...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
        <form onSubmit={handleTextSubmit} className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit(e);
                }
              }}
              placeholder="Digite sua mensagem ou pergunta financeira..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isProcessing}
            />
          </div>

          {/* Audio Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`p-2 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image size={20} />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Recording indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center justify-center space-x-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Gravando áudio...</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <p className="text-xs text-gray-500 mb-2">Ações rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Qual meu saldo atual?',
            'Registrar despesa de R$ 50',
            'Contas a pagar hoje',
            'Receitas do mês',
            'DRE atual'
          ].map((quickAction, index) => (
            <button
              key={index}
              onClick={() => {
                setInputText(quickAction);
              }}
              disabled={isProcessing}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {quickAction}
            </button>
          ))}
        </div>
        
        {/* Chat URL Info */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 font-medium mb-1">💡 Acesso Rápido ao Chat</p>
          <p className="text-xs text-blue-700">
            Para usar o chat no celular, acesse: <strong>/chat.html</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Você pode adicionar esta URL à tela inicial do seu dispositivo!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;