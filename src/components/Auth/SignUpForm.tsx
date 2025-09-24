import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from '../../hooks/useRouter';
import { supabase } from '../../lib/supabase';
import { UserPlus, Mail, Lock, User, Building, Phone, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface SignUpFormProps {
  onBackToLogin: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onBackToLogin }) => {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    email: '',
    password: '',
    confirmPassword: '',
    nomeEmpresa: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    plano: 'basico'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // 1. Criar usuário no Supabase Auth
      const { data, error: signUpError } = await signUp(formData.email, formData.password, {
        nome_completo: formData.nomeCompleto
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered' || signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
          setTimeout(() => {
            onBackToLogin();
          }, 2000);
        } else if (signUpError.message.includes('Password should be at least')) {
          setError('A senha deve ter pelo menos 6 caracteres.');
        } else if (signUpError.message.includes('Invalid email')) {
          setError('Email inválido. Verifique o formato.');
        } else {
          setError('Erro ao criar usuário: ' + signUpError.message);
        }
        setLoading(false);
        return;
      }

      // 2. Se o usuário foi criado, criar empresa e perfil
      if (data.user) {
        try {
          await createCompanyAndProfileViaEdgeFunction(data.user, formData);
          setSuccess(true);
        } catch (profileError: any) {
          setError('Usuário criado, mas houve erro ao configurar o perfil: ' + profileError.message);
          console.error('Profile creation error:', profileError);
        }
      }
    } catch (err: any) {
      setError('Erro inesperado: ' + err.message);
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCompanyAndProfileViaEdgeFunction = async (user: any, userData: typeof formData) => {
    try {
      // Chamar Edge Function para criar empresa e perfil com service role
      const { data, error } = await supabase.functions.invoke('create-company-profile', {
        body: {
          userId: user.id,
          nomeCompleto: userData.nomeCompleto,
          nomeEmpresa: userData.nomeEmpresa,
          cnpj: userData.cnpj || null,
          telefone: userData.telefone || null,
          email: userData.email,
          endereco: userData.endereco || null,
          cidade: userData.cidade || null,
          estado: userData.estado || null,
          cep: userData.cep || null,
          plano: userData.plano || 'basico'
        }
      });

      if (error) {
        throw new Error('Erro ao criar empresa e perfil: ' + error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido ao criar empresa e perfil');
      }

      return { success: true };
    } catch (error) {
      console.error('Error calling create-company-profile function:', error);
      throw error;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mb-6">
              <img 
                src="/10f97f14-9488-4367-a784-0868f7340b82 copy.png" 
                alt="RezendeTech Logo" 
                className="mx-auto h-16 w-auto mb-4"
              />
            </div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Conta Criada com Sucesso!
            </h2>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                Sua conta e empresa foram criadas com sucesso no RezendeTech ERP!
              </p>
              <div className="text-sm text-green-600 space-y-1">
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Empresa:</strong> {formData.nomeEmpresa}</p>
                <p><strong>Nome:</strong> {formData.nomeCompleto}</p>
                {formData.cidade && formData.estado && (
                  <p><strong>Localização:</strong> {formData.cidade}, {formData.estado}</p>
                )}
              </div>
              <p className="text-xs text-green-600 mt-3">
                Você já pode fazer login com suas credenciais.
              </p>
            </div>
            <button
              onClick={onBackToLogin}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
            >
              Ir para Login
            </button>
          </div>
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
              Crie sua conta e comece a usar nosso sistema
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
              <label htmlFor="nomeCompleto" className="block text-sm font-medium text-gray-700">
                Nome Completo *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="nomeCompleto"
                  name="nomeCompleto"
                  type="text"
                  required
                  value={formData.nomeCompleto}
                  onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha *
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
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Senha *
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
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <div>
              <label htmlFor="nomeEmpresa" className="block text-sm font-medium text-gray-700">
                Nome da Empresa *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="nomeEmpresa"
                  name="nomeEmpresa"
                  type="text"
                  required
                  value={formData.nomeEmpresa}
                  onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Nome da sua empresa"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                CNPJ (opcional)
              </label>
              <input
                id="cnpj"
                name="cnpj"
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="telefone"
                  name="telefone"
                  type="text"
                  required
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                CEP
              </label>
              <input
                id="cep"
                name="cep"
                type="text"
                required
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="00000-000"
              />
            </div>

            <div>
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                Endereço
              </label>
              <input
                id="endereco"
                name="endereco"
                type="text"
                required
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                  Cidade
                </label>
                <input
                  id="cidade"
                  name="cidade"
                  type="text"
                  required
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Sua cidade"
                />
              </div>

              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  id="estado"
                  name="estado"
                  required
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="plano" className="block text-sm font-medium text-gray-700">
                Plano
              </label>
              <select
                id="plano"
                name="plano"
                value={formData.plano}
                onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              >
                <option value="basico">Básico - Gratuito</option>
                <option value="premium">Premium - R$ 49,90/mês</option>
                <option value="enterprise">Enterprise - R$ 99,90/mês</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Criando conta...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <UserPlus size={18} />
                  <span>Criar Conta</span>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="group relative w-full flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Login
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

export default SignUpForm;