// Componente para conexão com Meta Ads usando componentes nativos
// Arquivo: frontend/src/components/MetaAdsConnection.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const MetaAdsConnection = () => {
  const { user, loading: authLoading } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar status da conexão ao carregar o componente
  useEffect(() => {
    const checkConnection = async () => {
      if (!user || !user.token) return;
      
      try {
        setLoading(true);
        const response = await axios.get('/api/meta/connection-status', {
          headers: {
            Authorization: `Bearer ${user.token}`
          },
          timeout: 5000 // Timeout para evitar requisições pendentes
        });
        
        setConnected(response.data.connected);
      } catch (err) {
        console.error('Erro ao verificar conexão com Meta Ads:', err);
        // Não mostrar erro ao usuário neste momento
      } finally {
        setLoading(false);
      }
    };
    
    checkConnection();
  }, [user]);

  // Função para conectar com Meta Ads
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || !user.token) {
        throw new Error('Usuário não autenticado');
      }
      
      // Obter URL de autorização
      const response = await axios.get('/api/meta/auth-url', {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      // Redirecionar para página de autorização do Facebook
      window.location.href = response.data.url;
      
    } catch (err) {
      console.error('Erro ao conectar com Meta Ads:', err);
      setError('Não foi possível iniciar a conexão com Meta Ads. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para desconectar do Meta Ads
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || !user.token) {
        throw new Error('Usuário não autenticado');
      }
      
      await axios.post('/api/meta/disconnect', {}, {
        headers: {
          Authorization: `Bearer ${user.token}`
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

  if (authLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
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
