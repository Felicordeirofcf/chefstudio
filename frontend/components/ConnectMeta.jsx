// Componente ConnectMeta.jsx - Botão e fluxo de conexão com Meta
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../lib/api-fetch';

const ConnectMeta = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, token } = useAuth();
  
  const handleConnectMeta = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se o usuário está autenticado
      const userId = user?._id;
      if (!userId || !token) {
        throw new Error('Usuário não identificado. Por favor, faça login novamente.');
      }
      
      // Consumir a URL de autenticação diretamente da API do backend com header Authorization
      const baseUrl = import.meta.env.VITE_API_URL || API_BASE_URL;
      const response = await fetch(`${baseUrl}/api/meta/auth-url`, {
        headers: {
          Authorization: `Bearer ${token}`
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
    } catch (err) {
      console.error('Erro ao iniciar conexão Meta:', err);
      setError(err.message || 'Erro ao iniciar conexão com Meta');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Conectar com Meta Ads</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
      )}
      
      <p className="mb-4">
        Para criar e gerenciar anúncios, você precisa conectar sua conta do Facebook/Instagram.
      </p>
      
      <button
        onClick={handleConnectMeta}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Conectando...
          </span>
        ) : (
          'Conectar Instagram / Facebook'
        )}
      </button>
      
      <p className="text-sm text-gray-600 mt-2">
        Ao conectar, você autoriza o ChefStudio a acessar suas contas de anúncios e criar campanhas em seu nome.
      </p>
    </div>
  );
};

export default ConnectMeta;
