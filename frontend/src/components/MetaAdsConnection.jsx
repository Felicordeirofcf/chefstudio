import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const MetaAdsConnection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleMetaConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter token JWT do localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Configurar URL da API
      const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      
      // Redirecionar para o endpoint de login do Meta com o token
      window.location.href = `${apiUrl}/api/meta/login?token=${token}`;
    } catch (error) {
      console.error('Erro ao conectar com Meta:', error);
      setError(error.message || 'Erro ao conectar com Meta');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter token JWT do localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Configurar URL da API
      const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      
      // Fazer requisição para desconectar do Meta
      const response = await axios.post(
        `${apiUrl}/api/meta/disconnect`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Atualizar dados do usuário no localStorage
      if (response.data && response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao desconectar do Meta:', error);
      setError(error.message || 'Erro ao desconectar do Meta');
      setLoading(false);
    }
  };

  const isConnected = user && user.metaConnectionStatus === 'connected';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Conexão com Meta Ads</CardTitle>
        <CardDescription>
          Conecte sua conta do Facebook/Instagram para gerenciar seus anúncios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaFacebook size={24} className="text-[#1877F2]" />
              <span>Facebook</span>
            </div>
            <div className="text-sm font-medium">
              {isConnected ? (
                <span className="text-green-600">Conectado</span>
              ) : (
                <span className="text-gray-400">Desconectado</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaInstagram size={24} className="text-[#E1306C]" />
              <span>Instagram</span>
            </div>
            <div className="text-sm font-medium">
              {isConnected ? (
                <span className="text-green-600">Conectado</span>
              ) : (
                <span className="text-gray-400">Desconectado</span>
              )}
            </div>
          </div>

          {isConnected && user.adsAccountId && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h3 className="font-medium text-sm text-gray-700">Conta de Anúncios Conectada</h3>
              <p className="text-sm text-gray-600 mt-1">{user.adsAccountName || user.adsAccountId}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isConnected ? (
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Desconectando...
              </>
            ) : (
              'Desconectar do Meta'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleMetaConnect}
            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <FaFacebook size={20} className="mr-2" />
                Conectar Instagram / Facebook
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default MetaAdsConnection;
