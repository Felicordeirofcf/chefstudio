import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const MetaAdsConnection = () => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { toast } = useToast();

  // Verificar status da conexão ao carregar o componente
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const userInfo = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (userInfo.data.hasMetaAdsConnection) {
        setConnectionStatus('connected');
        setSelectedAccount({
          id: userInfo.data.adsAccountId,
          name: userInfo.data.adsAccountName
        });
      } else {
        // Se o usuário está logado com Facebook mas não tem conta selecionada
        if (userInfo.data.facebookId) {
          fetchAdAccounts();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status da conexão:', error);
    }
  };

  const fetchAdAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/ads/accounts', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAccounts(response.data);
      setConnectionStatus('accounts_available');
    } catch (error) {
      console.error('Erro ao buscar contas de anúncios:', error);
      
      // Verificar se o erro é por falta de autenticação com Facebook
      if (error.response?.data?.needsFacebookAuth) {
        setConnectionStatus('disconnected');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.post('/ads/accounts/select', {
        accountId: account.id,
        accountName: account.name,
        accountCurrency: account.currency
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSelectedAccount(account);
      setConnectionStatus('connected');
      
      toast({
        title: 'Conta de anúncios conectada!',
        description: `A conta "${account.name}" foi conectada com sucesso.`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao selecionar conta de anúncios:', error);
      
      toast({
        title: 'Erro ao conectar conta',
        description: error.response?.data?.message || 'Não foi possível conectar a conta de anúncios.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFacebook = () => {
    // Redirecionar para o endpoint de autenticação do Facebook no backend
    const backendUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
    window.location.href = `${backendUrl}/api/auth/facebook`;
  };

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="bg-green-50 p-4 rounded-md border border-green-200">
            <h3 className="text-green-800 font-medium">Conectado ao Meta Ads</h3>
            <p className="text-green-700 mt-1">
              Conta conectada: <strong>{selectedAccount?.name}</strong> ({selectedAccount?.id})
            </p>
          </div>
        );
      
      case 'accounts_available':
        return (
          <div className="space-y-4">
            <h3 className="font-medium">Selecione uma conta de anúncios:</h3>
            {accounts.length === 0 ? (
              <p className="text-amber-700">Nenhuma conta de anúncios encontrada. Verifique se você tem acesso a contas de anúncios no Meta Ads.</p>
            ) : (
              <div className="grid gap-2">
                {accounts.map(account => (
                  <div 
                    key={account.id} 
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectAccount(account)}
                  >
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-gray-500">{account.id} • {account.currency}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'disconnected':
      default:
        return (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Conecte-se ao Meta Ads para gerenciar suas campanhas de anúncios diretamente pelo ChefStudio.
            </p>
            <Button 
              onClick={handleConnectFacebook}
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Conectar com Facebook'}
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão com Meta Ads</CardTitle>
      </CardHeader>
      <CardContent>
        {renderConnectionStatus()}
      </CardContent>
    </Card>
  );
};

export default MetaAdsConnection;
