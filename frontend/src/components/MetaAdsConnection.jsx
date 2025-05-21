// Componente MetaAdsConnection corrigido para autenticação adequada
// Arquivo: frontend/src/components/MetaAdsConnection.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MetaAdsConnection = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userToken, setUserToken] = useState(null);

  // Verificar status da conexão ao carregar o componente
  useEffect(() => {
    // Verificar token no localStorage (tanto 'token' quanto 'userInfo.token')
    const checkToken = () => {
      // Primeiro tenta obter o token diretamente
      let token = localStorage.getItem('token');
      
      // Se não encontrar, tenta obter do userInfo
      if (!token) {
        try {
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          token = userInfo.token;
        } catch (err) {
          console.error('Erro ao obter token do userInfo:', err);
        }
      }
      
      return token;
    };

    const token = checkToken();
    setUserToken(token);
    
    if (token) {
      checkConnection(token);
    }
  }, []);

  // Função para verificar conexão com Meta Ads
  const checkConnection = async (token) => {
    try {
      setLoading(true);
      
      // Verificar status da conexão com Meta Ads
      const response = await axios.get('/api/meta/connection-status', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000 // Timeout para evitar requisições pendentes
      });
      
      setConnected(response.data?.connected || false);
    } catch (err) {
      console.error('Erro ao verificar conexão com Meta Ads:', err);
      // Não mostrar erro ao usuário neste momento
      setConnected(false);
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
        // Se não houver token, tentar fazer login automático
        try {
          // Tentar obter credenciais salvas (implementação simplificada)
          const email = localStorage.getItem('userEmail');
          const password = localStorage.getItem('userPassword');
          
          if (email && password) {
            const loginResponse = await axios.post('/api/auth/login', { email, password });
            if (loginResponse.data && loginResponse.data.token) {
              localStorage.setItem('token', loginResponse.data.token);
              setUserToken(loginResponse.data.token);
            } else {
              throw new Error('Login automático falhou');
            }
          } else {
            throw new Error('Credenciais não encontradas');
          }
        } catch (loginErr) {
          throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }
      }
      
      // Obter URL de autorização
      const response = await axios.get('/api/meta/auth-url', {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      // Redirecionar para página de autorização do Facebook
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('URL de autorização não recebida');
      }
      
    } catch (err) {
      console.error('Erro ao conectar com Meta Ads:', err);
      setError('Não foi possível iniciar a conexão com Meta Ads. Por favor, faça login novamente.');
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
      
      await axios.post('/api/meta/disconnect', {}, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      setConnected(false);
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
      
      {connected ? (
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
