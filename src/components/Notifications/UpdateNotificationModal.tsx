import React, { useState } from 'react';
import { X, CheckCircle, Sparkles, Calendar, Package, Wrench, Bug } from 'lucide-react';

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

interface UpdateNotificationModalProps {
  version: Version;
  onClose: () => void;
  onDismiss: () => void;
}

const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  version,
  onClose,
  onDismiss
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 ${
          isClosing ? 'animate-scale-out opacity-0' : 'animate-scale-in'
        }`}
      >
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-10 animate-pulse"></div>

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {version.version_name}
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm font-semibold text-white bg-white bg-opacity-20 px-3 py-1 rounded-full">
                      v{version.version_number}
                    </span>
                    {version.is_major && (
                      <span className="text-xs font-bold text-yellow-300 bg-yellow-900 bg-opacity-50 px-2 py-1 rounded-full animate-pulse">
                        MAJOR
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-white text-opacity-90 mt-3">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{formatDate(version.release_date)}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
          {version.description && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{version.description}</p>
            </div>
          )}

          {version.features && version.features.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span>O que há de novo</span>
              </h3>

              <div className="space-y-3">
                {version.features.map((feature, index) => {
                  const badge = getFeatureBadge(feature.type);
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
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
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Atualização aplicada automaticamente</span>
            </div>

            <button
              onClick={handleDismiss}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotificationModal;
