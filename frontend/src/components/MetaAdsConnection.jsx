import React from 'react';
import { useMetaAds } from '../contexts/MetaAdsContext'; // Import the custom hook
import { useAuth } from '../hooks/useAuth';
import { Button } from "./ui/button"; // Assuming Button component exists
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"; // Assuming Alert components exist
import { InfoIcon, LoaderIcon } from "lucide-react"; // Assuming icons exist

const MetaAdsConnection = () => {
  // Consume state and functions from the context
  const { metaStatus, loading, error, connectMeta, disconnectMeta } = useMetaAds();
  const { userToken } = useAuth(); // Still need auth token check

  // Determine if fully connected based on context state, checking for valid data
  const isFullyConnected = 
    metaStatus.status === 'connected' && 
    Array.isArray(metaStatus.pages) && metaStatus.pages.length > 0 && metaStatus.pages[0]?.id &&
    Array.isArray(metaStatus.adAccounts) && metaStatus.adAccounts.length > 0 && metaStatus.adAccounts[0]?.id;

  // Handle case where user is not logged in
  if (!userToken) {
    return (
      <div className="p-4 bg-white border rounded-md mb-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">
          Conexão com Meta Ads
        </h2>
        <Alert variant="warning">
           <InfoIcon className="h-4 w-4" />
           <AlertTitle>Autenticação Necessária</AlertTitle>
           <AlertDescription>
             Você precisa estar autenticado para conectar ao Meta Ads. Por favor, faça login novamente.
           </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border rounded-md mb-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">
        Conexão com Meta Ads
      </h2>
      
      {/* Display context error if any */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Erro na Conexão Meta</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Display loading indicator from context */}
      {loading && !error && (
         <div className="flex items-center text-sm text-gray-500 mb-4">
           <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
           <span>Verificando status da conexão...</span>
         </div>
      )}

      {/* Conditional rendering based on context's metaStatus */}
      {!loading && isFullyConnected ? (
        <div>
          <Alert variant="success" className="mb-4">
             <InfoIcon className="h-4 w-4" />
             <AlertTitle>Conectado</AlertTitle>
             <AlertDescription>
               Sua conta está conectada e pronta para criar anúncios.
             </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={disconnectMeta} // Use disconnect function from context
            disabled={loading} // Use loading state from context
          >
            {loading ? (
              <span className="flex items-center">
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </span>
            ) : 'Desconectar Meta Ads'}
          </Button>
        </div>
      ) : !loading ? (
        // Show connect button if not loading and not fully connected
        <div>
           <Alert variant="info" className="mb-4">
             <InfoIcon className="h-4 w-4" />
             <AlertTitle>Conexão Necessária</AlertTitle>
             <AlertDescription>
               {metaStatus.status === 'connected' 
                 ? "Sua conta Meta está conectada, mas precisamos de acesso a páginas e contas de anúncio. Verifique as permissões ou tente reconectar."
                 : "Conecte sua conta ao Meta Ads para criar anúncios."
               }
             </AlertDescription>
           </Alert>
          <Button
            onClick={connectMeta} // Use connect function from context
            disabled={loading} // Use loading state from context
          >
            {loading ? (
              <span className="flex items-center">
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </span>
            ) : 'Conectar ao Meta Ads'}
          </Button>
        </div>
      ) : null} {/* Render nothing while loading initially if preferred */}
    </div>
  );
};

export default MetaAdsConnection;

