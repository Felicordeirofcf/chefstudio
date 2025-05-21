import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const MetaCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('Processando autenticação...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Obter parâmetros da URL
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const token = params.get('token');
        const error = params.get('error');

        if (error) {
          throw new Error(decodeURIComponent(error));
        }

        if (!code) {
          throw new Error('Código de autorização ausente');
        }

        if (!token) {
          throw new Error('Token de autenticação ausente');
        }

        // Configurar URL da API
        const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
        
        setStatus('Conectando com Meta Ads...');
        
        // Enviar código para o backend
        const response = await axios.post(
          `${apiUrl}/api/meta/connect`,
          { code },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Atualizar dados do usuário no localStorage
        if (response.data && response.data.user) {
          // Obter dados atuais do usuário
          const currentUserData = localStorage.getItem('user');
          const currentUser = currentUserData ? JSON.parse(currentUserData) : {};
          
          // Mesclar dados atuais com os novos dados
          const updatedUser = {
            ...currentUser,
            metaConnectionStatus: response.data.user.metaConnectionStatus,
            metaConnectedAt: response.data.user.metaConnectedAt,
            adsAccountId: response.data.user.adsAccountId,
            adsAccountName: response.data.user.adsAccountName,
            adAccounts: response.data.user.adAccounts
          };
          
          // Salvar dados atualizados
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        setStatus('Conexão realizada com sucesso!');
        
        // Redirecionar para o dashboard após 2 segundos
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (error) {
        console.error('Erro ao processar callback:', error);
        setError(error.message || 'Erro ao processar autenticação');
        
        // Redirecionar para o dashboard após 5 segundos em caso de erro
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Autenticação Meta</h1>
          
          {error ? (
            <div className="mt-4 p-4 bg-red-50 rounded-md text-red-700">
              <p className="font-medium">Erro na autenticação</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-4">Redirecionando para o dashboard...</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-gray-600">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaCallback;
