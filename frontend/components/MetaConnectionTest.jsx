// Componente de teste para validar a conexão com Meta Ads
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../lib/api-fetch';

const MetaConnectionTest = () => {
  const [status, setStatus] = useState('Verificando conexão...');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, refreshUserProfile } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar status de conexão atual
        const connectionStatus = await apiRequest('/meta/connection-status', 'GET');
        console.log('Status de conexão Meta:', connectionStatus);
        
        if (connectionStatus.connected) {
          setStatus('Conectado ao Meta');
          setDetails(connectionStatus);
        } else if (connectionStatus.tokenExpired) {
          setStatus('Token Meta expirado');
          setError('Seu token de acesso ao Meta expirou. Por favor, reconecte sua conta.');
        } else {
          // Verificar e atualizar status de conexão
          const verifyResult = await apiRequest('/meta/verify-connection', 'GET');
          console.log('Verificação de conexão Meta:', verifyResult);
          
          if (verifyResult.connected) {
            setStatus('Conexão verificada e atualizada');
            setDetails(verifyResult);
            
            // Atualizar perfil do usuário para refletir o novo status
            await refreshUserProfile();
          } else {
            setStatus('Não conectado ao Meta');
            setError(verifyResult.message || 'Não foi possível verificar a conexão com o Meta');
          }
        }
      } catch (err) {
        console.error('Erro ao verificar conexão Meta:', err);
        setStatus('Erro na verificação');
        setError(err.message || 'Erro ao verificar conexão com o Meta');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user._id) {
      checkConnection();
    } else {
      setStatus('Usuário não autenticado');
      setLoading(false);
    }
  }, [user, refreshUserProfile]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Status de Conexão Meta</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Verificando...</span>
        </div>
      ) : (
        <>
          <div className={`p-4 mb-4 rounded-lg ${
            status.includes('Conectado') ? 'bg-green-100 text-green-800' : 
            status.includes('Erro') || status.includes('Não conectado') ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            <p className="font-bold">{status}</p>
            {error && <p className="mt-2">{error}</p>}
          </div>
          
          {details && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Detalhes da Conexão:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>ID Meta: {details.metaId}</li>
                <li>Nome: {details.metaName}</li>
                {details.metaEmail && <li>Email: {details.metaEmail}</li>}
                {details.primaryAdAccountId && (
                  <li>Conta de Anúncios Principal: {details.primaryAdAccountName} ({details.primaryAdAccountId})</li>
                )}
                {details.adAccounts && details.adAccounts.length > 0 && (
                  <li>
                    Total de Contas de Anúncios: {details.adAccounts.length}
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MetaConnectionTest;
