import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

const MetaAdsConnection = () => {
  const [metaStatus, setMetaStatus] = useState({ status: 'disconnected', pages: [], adAccounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userToken } = useAuth();
  
  // Verificar status da conexão ao carregar o componente
  useEffect(() => {
    checkConnectionStatus();
  }, [userToken]);
  
  // Função para verificar status da conexão
  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      
      if (!userToken) {
        setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] }); // Reset state if no token
        setLoading(false); // Ensure loading stops
        return;
      }
       try {
        // Use the correct endpoint and update the metaStatus state object
        const response = await api.get("/api/meta/connection-status");
        // Ensure response.data has the expected structure, provide defaults if not
        setMetaStatus({
          status: response.data?.status || 'disconnected',
          pages: response.data?.pages || [],
          adAccounts: response.data?.adAccounts || []
        });
      } catch (err) {
        console.error("Erro ao verificar status da conexão Meta:", err);
        // Reset state on error
        setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] });
      }
    } catch (err) {
      // Este catch captura erros gerais fora da chamada da API (ex: erro no userToken)
      console.error("Erro geral ao verificar conexão com Meta Ads:", err);
      setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] }); // Garante reset em erro geral
    } finally {
      setLoading(false);
    }
  };

  // Função para conectar com Meta Ads
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userToken) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      // Consumir a URL de autenticação diretamente da API do backend com header Authorization
      const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/meta/auth-url`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao obter URL de autenticação: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error("URL de autenticação não retornada pelo servidor");
      }
      
      // Redirecionar para a URL fornecida pelo backend
      window.location.href = data.authUrl;
      
      return;
    } catch (err) {
      console.error('Erro ao conectar com Meta Ads:', err);
      setError('Não foi possível iniciar a conexão com Meta Ads. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Função para desconectar do Meta Ads
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userToken) {
        throw new Error('Usuário não autenticado');
      }
      
      try {
        await api.post('/api/meta/disconnect', {});
        setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] }); // Reset state on disconnect
      } catch (err) {
        // Se o primeiro endpoint falhar, tentar endpoint alternativo
        if (err.response && err.response.status === 404) {
          await api.post('/api/users/meta-disconnect', {});
          setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] }); // Reset state on disconnect
        } else {
          throw err;
        }
      }
      
      // Atualizar userInfo no localStorage
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        userInfo.metaConnectionStatus = 'disconnected';
        userInfo.isMetaConnected = false;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      } catch (localErr) {
        console.error('Erro ao atualizar userInfo no localStorage:', localErr);
      }
    } catch (err) {
      console.error('Erro ao desconectar do Meta Ads:', err);
      setError('Não foi possível desconectar do Meta Ads. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!userToken) {
    return (
      <div className="p-4 bg-white border rounded-md mb-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">
          Conexão com Meta Ads
        </h2>
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
          Você precisa estar autenticado para conectar ao Meta Ads. Por favor, faça login novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border rounded-md mb-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">
        Conexão com Meta Ads
      </h2>
      
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Conditional rendering based on metaStatus */}
      {metaStatus.status === 'connected' && metaStatus.pages?.length > 0 && metaStatus.adAccounts?.length > 0 ? (
        <div>
          <div className="p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            Sua conta está conectada ao Meta Ads
          </div>
          <button
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></span>
                Processando...
              </span>
            ) : 'Desconectar'}
          </button>
        </div>
      ) : (
        <div>
          <div className="p-4 mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
            Conecte sua conta ao Meta Ads para criar anúncios
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Processando...
              </span>
            ) : 'Conectar ao Meta Ads'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MetaAdsConnection;
