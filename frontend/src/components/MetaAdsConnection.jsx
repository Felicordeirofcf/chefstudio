// Componente para conexão com Meta Ads
// Arquivo: frontend/src/components/MetaAdsConnection.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Alert,
  Paper
} from '@mui/material';
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Conexão com Meta Ads
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {connected ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Sua conta está conectada ao Meta Ads
          </Alert>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleDisconnect}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Desconectar'}
          </Button>
        </Box>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Conecte sua conta ao Meta Ads para criar anúncios
          </Alert>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Conectar ao Meta Ads'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default MetaAdsConnection;
