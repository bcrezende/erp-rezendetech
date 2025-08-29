import React, { useState } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import { Building, Mail, Phone, MapPin, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const CompanyRegistrationForm: React.FC = () => {
  const { user, supabase } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    telefone: '',
    email: user?.email || '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    plano: 'basico'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user?.id) {
        throw new Error('Usuário não encontrado');
      }

      // Usar Edge Function para criar empresa e vincular ao perfil
      // Usar Edge Function para criar empresa e vincular ao perfil
      const { data, error } = await supabase.functions.invoke('create-and-link-company', {
        body: {
          userId: user.id,
          nomeEmpresa: formData.nomeEmpresa,
          cnpj: formData.cnpj || null,
          telefone: formData.telefone || null,
          email: formData.email || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          plano: formData.plano || 'basico'
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(`Failed to send a request to the Edge Function`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      setSuccess(true);
      
      // Recarregar a página após 2 segundos para que o AuthProvider detecte a empresa
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'Erro inesperado ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-600">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Empresa Cadastrada!
            </h2>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                Sua empresa foi criada e vinculada ao seu perfil com sucesso!
              </p>
              <div className="text-sm text-green-600 space-y-1">
                <p><strong>Empresa:</strong> {formData.nomeEmpresa}</p>
                {formData.cnpj && <p><strong>CNPJ:</strong> {formData.cnpj}</p>}
                {formData.cidade && formData.estado && (
                  <p><strong>Localização:</strong> {formData.cidade}, {formData.estado}</p>
                )}
              </div>
              <p className="text-xs text-green-600 mt-3">
                Redirecionando para o sistema em alguns segundos...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <Building className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Cadastre sua Empresa
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Para acessar o sistema, você precisa cadastrar os dados da sua empresa
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
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
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email da Empresa
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="contato@empresa.com"
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
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="00000-000"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                Endereço Completo
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="endereco"
                  name="endereco"
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Rua, número, bairro"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                type="text"
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
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              >
                <option value="">Selecione o estado</option>
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

            <div className="md:col-span-2">
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informações importantes:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Apenas o nome da empresa é obrigatório</li>
                  <li>• Você pode atualizar essas informações depois nas configurações</li>
                  <li>• O plano pode ser alterado a qualquer momento</li>
                  <li>• Seus dados estão seguros e protegidos</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !formData.nomeEmpresa.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Criando empresa...</span>
                </div>
              ) : (
                'Cadastrar Empresa e Acessar Sistema'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyRegistrationForm;