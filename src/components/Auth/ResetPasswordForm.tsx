import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { Lock, AlertCircle, CheckCircle, ArrowLeft, Key } from 'lucide-react';

const ResetPasswordForm: React.FC = () => {
  const { supabase } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validatingSession, setValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    validateResetSession();
  }, []);

  const validateResetSession = async () => {
    try {
      // Verificar se há tokens na URL (hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        console.log('❌ No tokens found in URL');
        setError('Link de redefinição inválido ou expirado. Solicite um novo link.');
        setValidatingSession(false);
        return;
      }

      console.log('🔍 Tokens found, setting session...');

      // Estabelecer sessão com os tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('❌ Error setting session:', error);
        setError('Link de redefinição inválido ou expirado. Solicite um novo link.');
        setValidatingSession(false);
        return;
      }

      if (data.session) {
        console.log('✅ Session established successfully');
        setSessionValid(true);
      } else {
        console.log('❌ No session created');
        setError('Não foi possível validar o link de redefinição.');
      }
    } catch (err) {
      console.error('❌ Error validating reset session:', err);
      setError('Erro inesperado ao validar o link de redefinição.');
    } finally {
      setValidatingSession(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Updating password...');

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Error updating password:', error);
        if (error.message.includes('Password should be at least')) {
          setError('A senha deve ter pelo menos 6 caracteres.');
        } else if (error.message.includes('New password should be different')) {
          setError('A nova senha deve ser diferente da senha atual.');
        } else {
          setError('Erro ao redefinir senha: ' + error.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Password updated successfully');
      setSuccess(true);

      // Fazer logout após redefinir senha para forçar novo login
      setTimeout(async () => {
        await supabase.auth.signOut();
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }, 2000);

    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      setError('Erro inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    window.location.href = '/';
  };

  // Loading state while validating session
  if (validatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Validando Link de Redefinição
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto validamos seu link de redefinição de senha...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Senha Redefinida com Sucesso!
            </h2>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                Sua senha foi alterada com sucesso!
              </p>
              <p className="text-xs text-green-600">
                Você será redirecionado para a tela de login em alguns segundos...
              </p>
            </div>
            <button
              onClick={goToLogin}
              className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir para Login Agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid or expired link)
  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-600">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Link Inválido ou Expirado
            </h2>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-2">
                {error || 'O link de redefinição de senha é inválido ou já expirou.'}
              </p>
              <p className="text-xs text-red-600">
                Solicite um novo link de redefinição na tela de login.
              </p>
            </div>
            <button
              onClick={goToLogin}
              className="mt-6 w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <Key className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Redefinir Senha
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite sua nova senha
          </p>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Nova Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                'Redefinir Senha'
              )}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login
            </button>
          </div>
        </form>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Key className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">🔒 Dicas de Segurança</h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p>• Use uma senha forte com pelo menos 6 caracteres</p>
                <p>• Combine letras, números e símbolos</p>
                <p>• Não use informações pessoais óbvias</p>
                <p>• Mantenha sua senha segura e não a compartilhe</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;