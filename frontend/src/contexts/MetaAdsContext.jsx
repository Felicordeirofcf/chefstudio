import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

// 1. Create Context
const MetaAdsContext = createContext();

// 2. Create Provider Component
export const MetaAdsProvider = ({ children }) => {
  const [metaStatus, setMetaStatus] = useState({ status: 'disconnected', pages: [], adAccounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userToken } = useAuth();

  // Function to check connection status (memoized with useCallback)
  const checkConnectionStatus = useCallback(async () => {
    if (!userToken) {
      setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/meta/connection-status");
      setMetaStatus({
        status: response.data?.status || 'disconnected',
        pages: response.data?.pages || [],
        adAccounts: response.data?.adAccounts || []
      });
    } catch (err) {
      console.error("Erro ao verificar status da conexão Meta no Contexto:", err);
      setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] });
      // Optionally set an error state here if needed for UI feedback
      // setError("Falha ao buscar status da conexão Meta.");
    } finally {
      setLoading(false);
    }
  }, [userToken]); // Dependency: userToken

  // Initial check on mount and when userToken changes
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Function to handle connection (initiate OAuth flow)
  const connectMeta = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userToken) throw new Error('Usuário não autenticado.');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/meta/auth-url`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (!response.ok) throw new Error(`Erro ${response.status} ao obter URL de autenticação.`);
      const data = await response.json();
      if (!data.authUrl) throw new Error("URL de autenticação não recebida.");
      window.location.href = data.authUrl; // Redirect to Meta OAuth
    } catch (err) {
      console.error("Erro ao iniciar conexão Meta:", err);
      setError(err.message || 'Falha ao iniciar conexão.');
      setLoading(false);
    }
    // No finally setLoading(false) here because of redirect
  };

  // Function to handle disconnection
  const disconnectMeta = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userToken) throw new Error('Usuário não autenticado.');
      await api.post('/api/meta/disconnect', {});
      setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] }); // Update context state
      // Optionally clear localStorage here if needed
    } catch (err) {
      console.error("Erro ao desconectar Meta:", err);
      setError(err.message || 'Falha ao desconectar.');
      // Even if disconnect fails, try to reset state locally
      setMetaStatus({ status: 'disconnected', pages: [], adAccounts: [] });
    } finally {
      setLoading(false);
    }
  };

  // Value provided by the context
  const value = {
    metaStatus,
    loading,
    error,
    checkConnectionStatus, // Expose check function if needed externally
    connectMeta,
    disconnectMeta
  };

  return (
    <MetaAdsContext.Provider value={value}>
      {children}
    </MetaAdsContext.Provider>
  );
};

// 3. Create Custom Hook to use the Context
export const useMetaAds = () => {
  const context = useContext(MetaAdsContext);
  if (context === undefined) {
    throw new Error('useMetaAds must be used within a MetaAdsProvider');
  }
  return context;
};

