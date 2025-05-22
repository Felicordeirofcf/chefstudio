// MetaCallback.jsx - Componente para processar o retorno da autenticação Meta
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../lib/api-fetch';

const MetaCallback = () => {
  const [status, setStatus] = useState('Processando conexão com Meta...');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUserContext, refreshUserProfile } = useAuth();

  useEffect(() => {
    const processMetaCallback = async () => {
      try {
        // Obter parâmetros da URL
        const params = new URLSearchParams(location.search);
        const metaConnected = params.get('meta_connected') === 'true';
        const metaError = params.get('meta_error') === 'true';
        const errorMessage = params.get('message');
        const userId = params.get('userId');

        if (metaError) {
          setError(errorMessage || 'Erro ao conectar com Meta');
          setTimeout(() => navigate('/dashboard'), 3000);
          return;
        }

        if (metaConnected) {
          setStatus('Conexão com Meta bem-sucedida! Atualizando perfil...');
          
          // Atualizar status de conexão no backend
          await apiRequest('/auth/meta-connect', 'POST', { 
            userId: userId || user?._id,
            connected: true 
          });
          
          // Atualizar contexto do usuário
          updateUserContext({ 
            metaConnectionStatus: 'connected',
            isMetaConnected: true
          });
          
          // Recarregar perfil completo do usuário
          await refreshUserProfile();
          
          setStatus('Perfil atualizado! Redirecionando...');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setError('Parâmetros de retorno inválidos');
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } catch (err) {
        console.error('Erro ao processar callback Meta:', err);
        setError(err.message || 'Erro ao processar conexão Meta');
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    };

    processMetaCallback();
  }, [location, navigate, user, updateUserContext, refreshUserProfile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Conexão Meta</h1>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Erro</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-700">{status}</p>
          </div>
        )}
        
        <p className="text-center text-gray-500 mt-4">
          Você será redirecionado automaticamente...
        </p>
      </div>
    </div>
  );
};

export default MetaCallback;
