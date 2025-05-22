// Componente MetaConnectionStatus - Verifica e exibe o status de conexão Meta
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMetaConnectionStatus, verifyMetaConnection } from '../lib/api-fetch-fixed';

const MetaConnectionStatus = () => {
  const [status, setStatus] = useState('Verificando...');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, refreshUserProfile } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Primeiro verificar o status atual
        const connectionStatus = await getMetaConnectionStatus();
        console.log('Status de conexão Meta:', connectionStatus);
        
        if (connectionStatus.connected) {
          setStatus('Conectado ao Meta');
          setIsConnected(true);
        } else {
          // Se não estiver conectado, tentar verificar e atualizar
          const verifyResult = await verifyMetaConnection();
          console.log('Verificação de conexão Meta:', verifyResult);
          
          if (verifyResult.connected) {
            setStatus('Conexão verificada e atualizada');
            setIsConnected(true);
            
            // Atualizar perfil do usuário
            await refreshUserProfile();
          } else {
            setStatus('Não conectado ao Meta');
            setIsConnected(false);
            
            if (verifyResult.tokenExpired) {
              setError('Seu token de acesso ao Meta expirou. Por favor, reconecte sua conta.');
            } else {
              setError(verifyResult.message || 'Você precisa conectar sua conta ao Meta Ads para acessar esta funcionalidade.');
            }
          }
        }
      } catch (err) {
        console.error('Erro ao verificar conexão Meta:', err);
        setStatus('Erro na verificação');
        setIsConnected(false);
        setError(err.message || 'Erro ao verificar conexão com o Meta');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user._id) {
      checkConnection();
    } else {
      setStatus('Usuário não autenticado');
      setIsConnected(false);
      setLoading(false);
    }
  }, [user, refreshUserProfile]);

  const handleConnect = () => {
    window.location.href = '/connect-meta';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : loading ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          <span className="font-medium">{status}</span>
        </div>
        
        {!isConnected && !loading && (
          <button 
            onClick={handleConnect}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
          >
            Conectar
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

export default MetaConnectionStatus;
