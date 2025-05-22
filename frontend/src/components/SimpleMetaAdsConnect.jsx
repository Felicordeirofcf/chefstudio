import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configurações do Facebook OAuth
const FB_APP_ID = '2430942723957669';
const FB_REDIRECT_URI = window.location.origin + '/dashboard';
const FB_SCOPE = 'ads_management,ads_read,business_management,pages_read_engagement,instagram_basic,public_profile';

const SimpleMetaAdsConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [adName, setAdName] = useState('');
  const [budget, setBudget] = useState(50);
  const [radius, setRadius] = useState(5);

  // Verificar status de conexão ao carregar
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Função para verificar status de conexão
  const checkConnectionStatus = () => {
    // Verificar parâmetros na URL (após redirecionamento do Facebook)
    const urlParams = new URLSearchParams(window.location.search);
    const hasToken = urlParams.has('access_token');
    const hasCode = urlParams.has('code');
    
    if (hasToken || hasCode) {
      console.log("Parâmetros de autenticação detectados na URL");
      handleSuccessfulConnection();
      return true;
    }
    
    // Verificar localStorage
    const metaConnected = localStorage.getItem('metaConnected') === 'true';
    const metaToken = localStorage.getItem('metaToken');
    
    if (metaConnected && metaToken) {
      console.log("Conexão Meta detectada no localStorage");
      setIsConnected(true);
      return true;
    }
    
    return false;
  };

  // Função para lidar com conexão bem-sucedida
  const handleSuccessfulConnection = () => {
    // Salvar status no localStorage
    localStorage.setItem('metaConnected', 'true');
    localStorage.setItem('metaToken', `token_${Date.now()}`);
    localStorage.setItem('metaConnectedAt', new Date().toISOString());
    
    // Atualizar estado
    setIsConnected(true);
    
    // Limpar parâmetros da URL
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Função para conectar com Meta Ads
  const handleConnectMeta = () => {
    // Construir URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&scope=${encodeURIComponent(FB_SCOPE)}&response_type=token`;
    
    // Redirecionar para a página de autorização do Facebook
    window.location.href = authUrl;
  };

  // Função para criar anúncio
  const handleCreateAd = async (e) => {
    e.preventDefault();
    
    if (!linkUrl || !adName) {
      setError('Por favor, preencha o nome do anúncio e o link que deseja promover.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Obter localização do usuário (simplificado)
      let userLocation = { lat: -23.5505, lng: -46.6333 }; // São Paulo como padrão
      
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (err) {
        console.warn("Não foi possível obter localização, usando padrão:", err);
      }
      
      // Dados do anúncio
      const adData = {
        name: adName,
        budget: budget,
        radius: radius,
        link_url: linkUrl,
        location: userLocation,
        // Dados específicos para Meta Ads
        targeting: {
          geo_locations: {
            radius: radius,
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            distance_unit: "kilometer"
          },
          age_min: 18,
          age_max: 65,
          publisher_platforms: ["facebook", "instagram"],
          device_platforms: ["mobile", "desktop"]
        },
        status: "ACTIVE"
      };
      
      console.log("Enviando dados para criação de anúncio:", adData);
      
      // Enviar para o backend
      const response = await axios.post('/api/meta/create-ad', adData);
      
      console.log("Anúncio criado com sucesso:", response.data);
      
      // Limpar formulário e mostrar sucesso
      setLinkUrl('');
      setAdName('');
      setBudget(50);
      setSuccess(true);
      
      // Esconder mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error("Erro ao criar anúncio:", err);
      setError(err.response?.data?.message || 'Erro ao criar anúncio. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Se não estiver conectado, mostrar botão de conexão
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Conectar ao Meta Ads</h2>
        <p className="text-gray-600 mb-6">
          Para criar anúncios no Facebook e Instagram, você precisa conectar sua conta do Meta Ads primeiro.
        </p>
        
        <button 
          onClick={handleConnectMeta}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Conectar com Meta Ads
        </button>
        
        <p className="text-sm text-gray-500 mt-4 text-center">
          Você será redirecionado para o Facebook para autorizar o acesso.
        </p>
      </div>
    );
  }

  // Se estiver conectado, mostrar formulário de criação de anúncio
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Criar Anúncio Rápido</h2>
      <p className="text-gray-600 mb-6">
        Cole o link de uma publicação do Facebook ou Instagram que você deseja promover.
      </p>
      
      <form onSubmit={handleCreateAd} className="space-y-4">
        <div>
          <label htmlFor="adName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Anúncio
          </label>
          <input
            type="text"
            id="adName"
            value={adName}
            onChange={(e) => setAdName(e.target.value)}
            placeholder="Ex: Promoção de Fim de Semana"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        
        <div>
          <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Link da Publicação ou Cardápio
          </label>
          <input
            type="url"
            id="linkUrl"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.facebook.com/sua-publicacao ou https://www.instagram.com/p/codigo/"
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Cole o link completo da publicação ou cardápio que deseja promover
          </p>
        </div>
        
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
            Orçamento Diário (R$)
          </label>
          <input
            type="number"
            id="budget"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min="50"
            max="1000"
            step="10"
            className="w-full p-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Valor mínimo: R$ 50,00
          </p>
        </div>
        
        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">
            Raio de Alcance (km)
          </label>
          <input
            type="range"
            id="radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="1"
            max="10"
            step="1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 km</span>
            <span>{radius} km</span>
            <span>10 km</span>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center justify-center ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Criando Anúncio...
            </>
          ) : (
            'Criar Anúncio'
          )}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Anúncio criado com sucesso! Ele começará a ser exibido em breve.
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleMetaAdsConnect;
