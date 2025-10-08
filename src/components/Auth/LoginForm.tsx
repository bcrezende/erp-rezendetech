import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from '../../hooks/useRouter';
import { LogIn, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface LoginFormProps {}

const LoginForm: React.FC<LoginFormProps> = () => {
  const { signIn } = useAuth();
  const { supabase } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');


    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('invalid_credentials')) {
          setError('Email ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Email não confirmado. Verifique sua caixa de entrada.');
        } else {
          setError('Erro ao fazer login: ' + error.message);
        }
      } else {
        // Aguardar um pouco para o estado de autenticação ser atualizado
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('❌ Erro ao enviar email de redefinição:', error);
        if (error.message.includes('Email not found') || error.message.includes('User not found')) {
          setForgotPasswordError('Email não encontrado. Verifique se o email está correto.');
        } else if (error.message.includes('Email rate limit exceeded')) {
          setForgotPasswordError('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
        } else {
          setForgotPasswordError('Erro ao enviar email: ' + error.message);
        }
      } else {
        console.log('✅ Email de redefinição enviado com sucesso');
        setForgotPasswordSuccess(true);
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao enviar email:', err);
      setForgotPasswordError('Erro inesperado. Tente novamente.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const resetForgotPasswordForm = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
    setForgotPasswordLoading(false);
  };

  const goToLogin = () => {
    navigate('/auth');
  };

  // Se está mostrando o formulário de esqueci senha
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="text-center mb-6">
              <img 
                src="/10f97f14-9488-4367-a784-0868f7340b82 copy.png" 
                alt="RezendeTech Logo" 
                className="mx-auto h-16 w-auto mb-4"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Redefinir Senha
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              RezendeTech ERP - Digite seu email para receber as instruções
            </p>
          </div>

          {forgotPasswordSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">
                  Email enviado com sucesso!
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  📧 Enviamos um email para <strong>{forgotPasswordEmail}</strong>
                </p>
                <p className="text-xs text-blue-700">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  Se não receber o email em alguns minutos, verifique a pasta de spam.
                </p>
              </div>
              <button
                onClick={resetForgotPasswordForm}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Login
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
              {forgotPasswordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">{forgotPasswordError}</span>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="forgot-email"
                    name="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotPasswordLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    'Enviar Email de Redefinição'
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForgotPasswordForm}
                  className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center mb-8">
            <img 
              src="/10f97f14-9488-4367-a784-0868f7340b82 copy.png" 
              alt="RezendeTech Logo" 
              className="mx-auto h-20 w-auto mb-6"
            />
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              <h1 className="text-3xl font-bold mb-2">Bem-vindo ao ERP</h1>
              <h2 className="text-2xl font-semibold">RezendeTech</h2>
            </div>
            <p className="mt-3 text-gray-600 text-sm">
              Sistema de Gestão Empresarial Completo
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Sua senha"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn size={18} />
                  <span>Acessar Sistema</span>
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
             className="w-full text-sm text-white font-medium bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/planos')}
              className="w-full text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm font-medium py-3 px-4 border border-transparent rounded-lg transition-all duration-200 shadow-lg"
            >
              🚀 Adquira Já - Criar Conta Premium
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2025 RezendeTech. Todos os direitos reservados.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Sistema ERP com IA integrada para gestão empresarial
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;