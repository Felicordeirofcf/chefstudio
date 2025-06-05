
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation
import { useAuth } from '../hooks/useAuth';
import { useMetaAds } from '../contexts/MetaAdsContext'; // Import the context hook

const MetaAdsConnection = () => {
  const location = useLocation(); // Get location object
  const { userToken } = useAuth();
  // Use values from the MetaAdsContext
  const { metaStatus, loading, error, connectMeta, disconnectMeta, checkConnectionStatus } = useMetaAds();

  // Effect to check for the success parameter in the URL and refresh status
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search); // Use location.search
    if (urlParams.get('meta_connect') === 'success') {
      console.log("Meta connect success detected in MetaAdsConnection, forcing status check...");
      checkConnectionStatus(); // Call the context's function to refresh status
      // Clear the query parameter from the URL to prevent re-triggering on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Depend on location.search to re-run if URL params change, and checkConnectionStatus
  }, [location.search, checkConnectionStatus]);

  // If user is not authenticated, show a message
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

  // Main component rendering based on context state
  return (
    <div className="p-4 bg-white border rounded-md mb-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">
        Conexão com Meta Ads
      </h2>

      {/* Display error message from context if any */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          Erro: {error}
        </div>
      )}

      {/* Conditional rendering based on metaStatus from context */}
      {metaStatus.status === 'connected' ? (
        <div>
          <div className="p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            Sua conta está conectada ao Meta Ads.
            {/* Optionally display connected pages/accounts */}
            {/* {metaStatus.pages.length > 0 && <p>Páginas: {metaStatus.pages.map(p => p.name).join(', ')}</p>} */}
            {/* {metaStatus.adAccounts.length > 0 && <p>Contas de Anúncio: {metaStatus.adAccounts.map(a => a.name).join(', ')}</p>} */}
          </div>
          <button
            className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
            onClick={disconnectMeta} // Use disconnect function from context
            disabled={loading} // Use loading state from context
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full mr-2"></span>
                Processando...
              </span>
            ) : 'Desconectar Meta Ads'}
          </button>
        </div>
      ) : (
        <div>
          <div className="p-4 mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
            {loading
              ? 'Verificando status da conexão...'
              : 'Conecte sua conta ao Meta Ads para criar e gerenciar anúncios.'}
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={connectMeta} // Use connect function from context
            disabled={loading} // Use loading state from context
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

