import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Calendar, Sparkles, Wrench, Bug, Clock } from 'lucide-react';

interface Feature {
  type: 'new' | 'improvement' | 'fix';
  description: string;
}

interface Version {
  id: string;
  version_number: string;
  version_name: string;
  release_date: string;
  description: string;
  features: Feature[];
  is_major: boolean;
}

const SystemVersionInfo: React.FC = () => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    fetchVersions();
    fetchCurrentVersion();
  }, []);

  const fetchCurrentVersion = async () => {
    try {
      const response = await fetch('/package.json');
      const data = await response.json();
      setCurrentVersion(data.version || '1.0.0');
    } catch (error) {
      console.error('Error fetching current version:', error);
      setCurrentVersion('1.0.0');
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_versions')
        .select('*')
        .eq('is_active', true)
        .order('release_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setVersions(data.map(v => ({
          id: v.id,
          version_number: v.version_number,
          version_name: v.version_name,
          release_date: v.release_date,
          description: v.description || '',
          features: Array.isArray(v.features) ? v.features : [],
          is_major: v.is_major || false,
        })));
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'new':
        return <Sparkles className="h-4 w-4 text-green-600" />;
      case 'improvement':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'fix':
        return <Bug className="h-4 w-4 text-orange-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFeatureBadge = (type: string) => {
    switch (type) {
      case 'new':
        return { label: 'Nova Feature', className: 'bg-green-100 text-green-800 border-green-200' };
      case 'improvement':
        return { label: 'Melhoria', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'fix':
        return { label: 'Correção', className: 'bg-orange-100 text-orange-800 border-orange-200' };
      default:
        return { label: 'Atualização', className: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <p className="ml-3 text-gray-600">Carregando informações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Versão Atual do Sistema</h3>
            <p className="text-white text-opacity-90 text-sm">RezendeTech ERP</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-4xl font-bold bg-white bg-opacity-20 px-6 py-3 rounded-lg backdrop-blur-sm">
            v{currentVersion}
          </div>
          <div className="flex-1">
            <p className="text-white text-opacity-90 text-sm">
              Sistema sempre atualizado automaticamente
            </p>
            <p className="text-white text-opacity-75 text-xs mt-1">
              Novas versões são aplicadas sem necessidade de intervenção
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Atualizações</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Confira todas as melhorias e novidades implementadas
            </p>
          </div>
        </div>

        {versions.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Nenhuma atualização registrada ainda
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={`border-l-4 ${
                  index === 0
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                } rounded-lg p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {version.version_name}
                      </h4>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        index === 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                      }`}>
                        v{version.version_number}
                      </span>
                      {version.is_major && (
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300 px-2 py-1 rounded-full">
                          MAJOR
                        </span>
                      )}
                      {index === 0 && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-full animate-pulse">
                          ATUAL
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(version.release_date)}</span>
                    </div>

                    {version.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {version.description}
                      </p>
                    )}
                  </div>
                </div>

                {version.features && version.features.length > 0 && (
                  <div className="space-y-2">
                    {version.features.map((feature, featureIndex) => {
                      const badge = getFeatureBadge(feature.type);
                      return (
                        <div
                          key={featureIndex}
                          className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getFeatureIcon(feature.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-1 rounded border ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Sobre as Atualizações
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• O sistema é atualizado automaticamente sem necessidade de reinstalação</p>
              <p>• Você receberá notificações sempre que uma nova versão for lançada</p>
              <p>• Todas as suas configurações e dados são preservados durante as atualizações</p>
              <p>• Atualizações MAJOR podem incluir mudanças significativas de interface ou funcionalidades</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemVersionInfo;
