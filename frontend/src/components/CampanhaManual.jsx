import React, { useState, useEffect } from 'react';
import { createCampaign, uploadCampaignMedia } from '../lib/api';

// Configurações do Facebook OAuth
const FB_APP_ID = '2430942723957669'; // ID do app do Facebook corrigido
const FB_REDIRECT_URI = window.location.origin + '/dashboard'; // Redireciona de volta para o dashboard
const FB_SCOPE = 'ads_management,ads_read,business_management,pages_read_engagement,instagram_basic,public_profile';

const CampanhaManual = () => {
  // Estados para os campos do formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [textoAnuncio, setTextoAnuncio] = useState('');
  const [imagemVideo, setImagemVideo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [circle, setCircle] = useState(null);

  // Estados para controle de carregamento e erros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  // Verificar status de conexão Meta - Abordagem simplificada
  useEffect(() => {
    const checkMetaConnection = () => {
      console.log("CampanhaManual: Verificando status de conexão Meta");
      
      // Forçar conexão se estiver na URL do dashboard com token de acesso
      const currentUrl = window.location.href;
      if (currentUrl.includes('dashboard') && 
          (currentUrl.includes('access_token') || 
           currentUrl.includes('code') || 
           currentUrl.includes('state'))) {
        console.log("CampanhaManual: Parâmetros de autenticação detectados na URL");
        setIsMetaConnected(true);
        
        // Salvar no localStorage para persistência
        localStorage.setItem('metaConnected', 'true');
        localStorage.setItem('metaConnectedAt', new Date().toISOString());
        
        return true;
      }
      
      // Verificar localStorage diretamente
      const isConnected = localStorage.getItem('metaConnected') === 'true';
      if (isConnected) {
        console.log("CampanhaManual: Status conectado encontrado no localStorage");
        setIsMetaConnected(true);
        return true;
      }
      
      // Verificar metaInfo no localStorage
      try {
        const metaInfoStr = localStorage.getItem('metaInfo');
        if (metaInfoStr) {
          const metaInfo = JSON.parse(metaInfoStr);
          if (metaInfo.isConnected || metaInfo.accessToken) {
            console.log("CampanhaManual: Conexão detectada via metaInfo");
            setIsMetaConnected(true);
            localStorage.setItem('metaConnected', 'true');
            return true;
          }
        }
      } catch (e) {
        console.error("Erro ao verificar metaInfo:", e);
      }
      
      // Verificar userInfo no localStorage
      try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo.isMetaConnected || 
              userInfo.metaConnectionStatus === "connected" || 
              userInfo.metaAccessToken) {
            console.log("CampanhaManual: Conexão detectada via userInfo");
            setIsMetaConnected(true);
            localStorage.setItem('metaConnected', 'true');
            return true;
          }
        }
      } catch (e) {
        console.error("Erro ao verificar userInfo:", e);
      }
      
      // Verificar parâmetros na URL
      const urlParams = new URLSearchParams(window.location.search);
      const hasToken = urlParams.has('access_token');
      const hasCode = urlParams.has('code');
      const hasState = urlParams.has('state');
      
      if (hasToken || hasCode || hasState) {
        console.log("CampanhaManual: Parâmetros de autenticação encontrados na URL");
        setIsMetaConnected(true);
        localStorage.setItem('metaConnected', 'true');
        return true;
      }
      
      console.log("CampanhaManual: Nenhuma conexão Meta detectada");
      return false;
    };
    
    // Verificar imediatamente
    const isConnected = checkMetaConnection();
    setIsMetaConnected(isConnected);
    
    // Verificar novamente após um pequeno delay
    setTimeout(() => {
      const delayedCheck = checkMetaConnection();
      setIsMetaConnected(delayedCheck);
      
      // Se ainda não estiver conectado, verificar uma última vez após um delay maior
      if (!delayedCheck) {
        setTimeout(() => {
          const finalCheck = checkMetaConnection();
          setIsMetaConnected(finalCheck);
        }, 1500);
      }
    }, 500);
    
    // Verificar a cada 3 segundos (polling limitado)
    const intervalId = setInterval(() => {
      checkMetaConnection();
    }, 3000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Inicializar o mapa quando o componente montar com localização em tempo real
  useEffect(() => {
    // Verificar se o Leaflet está disponível globalmente
    if (window.L && !mapLoaded) {
      // Criar script para carregar o CSS do Leaflet
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);

      // Inicializar o mapa após um pequeno delay para garantir que o CSS foi carregado
      setTimeout(() => {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
          // Inicializar o mapa com posição padrão (será atualizada com geolocalização)
          const mapInstance = window.L.map('map-container').setView([-23.5505, -46.6333], 14);
          
          // Adicionar camada de tiles
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstance);
          
          // Adicionar círculo para representar o raio (será atualizado com a posição real)
          const circleInstance = window.L.circle([-23.5505, -46.6333], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.2,
            radius: raioAlcance * 1000 // Converter para metros
          }).addTo(mapInstance);
          
          // Adicionar marcador para a posição atual
          const markerIcon = window.L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            shadowSize: [41, 41]
          });
          
          const marker = window.L.marker([-23.5505, -46.6333], {icon: markerIcon}).addTo(mapInstance);
          marker.bindPopup("Sua localização atual").openPopup();
          
          // Obter localização em tempo real
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const userLocation = [latitude, longitude];
                
                // Atualizar mapa com a localização real
                mapInstance.setView(userLocation, 14);
                marker.setLatLng(userLocation);
                circleInstance.setLatLng(userLocation);
                
                // Adicionar popup informativo
                marker.bindPopup("Sua localização atual<br>Raio de alcance: " + raioAlcance + " km").openPopup();
                
                console.log("Localização obtida:", userLocation);
              },
              (error) => {
                console.error("Erro ao obter localização:", error);
                // Manter localização padrão em caso de erro
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            
            // Observar mudanças na localização
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const userLocation = [latitude, longitude];
                
                // Atualizar posição do marcador e círculo
                marker.setLatLng(userLocation);
                circleInstance.setLatLng(userLocation);
                
                // Atualizar popup
                marker.bindPopup("Sua localização atual<br>Raio de alcance: " + raioAlcance + " km");
              },
              (error) => {
                console.error("Erro ao observar localização:", error);
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            
            // Limpar observador ao desmontar
            return () => {
              navigator.geolocation.clearWatch(watchId);
            };
          }
          
          // Salvar referências
          setMap(mapInstance);
          setCircle(circleInstance);
          setMapLoaded(true);
        }
      }, 500);
    } else if (!window.L) {
      // Se o Leaflet não estiver disponível, carregá-lo dinamicamente
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => {
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    }

    // Limpeza ao desmontar
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Atualizar o raio do círculo quando o valor do slider mudar
  useEffect(() => {
    if (circle && map) {
      circle.setRadius(raioAlcance * 1000);
    }
  }, [raioAlcance, circle, map]);

  // Função para lidar com o upload de imagem/vídeo
  const handleImagemVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagemVideo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para conectar com Meta Ads usando OAuth direto
  const handleConnectMeta = () => {
    // Construir URL de autorização do Facebook
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&scope=${encodeURIComponent(FB_SCOPE)}&response_type=token`;
    
    // Redirecionar para a página de autorização do Facebook
    window.location.href = authUrl;
  };

  // Função para criar a campanha automaticamente com Meta Ads
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação simplificada: apenas nome, texto e uma das opções (link ou imagem)
    if (!nomeCampanha || !textoAnuncio || (!linkPublicacao && !imagemVideo)) {
      setError('Por favor, adicione um nome para a campanha, texto do anúncio e uma imagem ou link do cardápio.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário está autenticado
      const token = localStorage.getItem('token') || (userInfo && userInfo.token);
      const metaToken = localStorage.getItem('metaInfo') ? JSON.parse(localStorage.getItem('metaInfo')).accessToken : null;
      
      if (!token) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      if (!metaToken && !userInfo?.metaAccessToken) {
        throw new Error('Conexão com Meta Ads não encontrada. Por favor, conecte sua conta novamente.');
      }

      // Obter localização atual para o anúncio
      let userLocation = { lat: -23.5505, lng: -46.6333 }; // Localização padrão (São Paulo)
      
      try {
        // Tentar obter localização atual
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
        
        console.log("Localização obtida para anúncio:", userLocation);
      } catch (locError) {
        console.warn("Não foi possível obter localização precisa, usando padrão:", locError);
      }

      // Preparar dados para envio - Formato simplificado para Meta Ads
      const campaignData = {
        name: nomeCampanha,
        budget: orcamento,
        radius: raioAlcance,
        adText: textoAnuncio,
        postUrl: linkPublicacao || '',
        location: userLocation,
        // Dados específicos para Meta Ads
        targeting: {
          geo_locations: {
            radius: raioAlcance,
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            distance_unit: "kilometer"
          },
          age_min: 18,
          age_max: 65,
          publisher_platforms: ["facebook", "instagram"],
          device_platforms: ["mobile", "desktop"]
        },
        optimization_goal: "REACH", // Alcance máximo
        billing_event: "IMPRESSIONS", // Cobrança por impressões
        status: "ACTIVE", // Ativar imediatamente
        special_ad_categories: [], // Sem categorias especiais
        access_token: metaToken || userInfo?.metaAccessToken
      };

      console.log("Enviando dados para criação de anúncio:", campaignData);

      // Usar a função correta da API para criar campanha
      const response = await createCampaign(campaignData);
      console.log("Resposta da criação de campanha:", response);

      // Se houver imagem/vídeo, fazer upload separado
      if (imagemVideo && response.id) {
        const campaignId = response.id || response._id;
        console.log("Enviando imagem para campanha ID:", campaignId);
        await uploadCampaignMedia(campaignId, imagemVideo);
      }

      // Limpar formulário após sucesso
      setNomeCampanha('');
      setOrcamento(70);
      setRaioAlcance(5);
      setLinkPublicacao('');
      setTextoAnuncio('');
      setImagemVideo(null);
      setImagemPreview('');
      
      // Exibir mensagem de sucesso
      setSuccess(true);
      
      // Atualizar a lista de produtos anunciados
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('anuncioCreated', { detail: response }));
      }
      
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      
      // Tratamento específico para erros comuns
      if (error.response) {
        if (error.response.status === 405) {
          setError('Erro no servidor: método não permitido. Por favor, entre em contato com o suporte.');
        } else if (error.response.status === 401) {
          setError('Autorização expirada. Por favor, reconecte sua conta Meta Ads.');
        } else if (error.response.data && error.response.data.error) {
          setError(`Erro do Meta Ads: ${error.response.data.error.message || 'Erro desconhecido'}`);
        } else {
          setError(`Erro ${error.response.status}: ${error.response.statusText || 'Erro desconhecido'}`);
        }
      } else {
        setError(error.message || 'Erro ao criar campanha. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fechar alerta de sucesso
  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  // Se o usuário não estiver conectado ao Meta Ads, mostrar botão de conexão
  if (!isMetaConnected) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Conectar ao Meta Ads</h2>
        <p className="text-gray-600 mb-6">
          Para criar anúncios no Meta Ads, você precisa conectar sua conta do Facebook primeiro.
          Isso permitirá que o ChefStudio crie e gerencie campanhas em seu nome.
        </p>
        
        <div className="flex flex-col items-center justify-center py-8">
          <button 
            onClick={handleConnectMeta}
            className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Conectar com Meta Ads
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Você será redirecionado para o Facebook para autorizar o acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">
          Configurações da Campanha Manual
        </h2>
        <p className="text-sm text-gray-500">
          Defina os parâmetros para sua campanha de anúncios no Meta Ads.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lado esquerdo - Mapa e Raio */}
          <div>
            <div 
              id="map-container"
              className="relative h-[300px] bg-gray-100 rounded-md overflow-hidden"
              style={{ width: '100%', height: '300px' }}
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="raioAlcance" className="block mb-2">
                Raio de Alcance ({raioAlcance} Km)
              </label>
              <input
                type="range"
                id="raioAlcance"
                value={raioAlcance}
                onChange={(e) => setRaioAlcance(parseInt(e.target.value))}
                min="1"
                max="7"
                step="1"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 Km</span>
                <span>7 Km</span>
              </div>
            </div>
          </div>

          {/* Lado direito - Formulário */}
          <div className="space-y-4">
            <div>
              <label htmlFor="nomeCampanha" className="block mb-2">
                Nome da Campanha
              </label>
              <input
                type="text"
                id="nomeCampanha"
                value={nomeCampanha}
                onChange={(e) => setNomeCampanha(e.target.value)}
                placeholder="Ex: Promoção de Fim de Semana"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="orcamento" className="block mb-2">
                Orçamento Diário (R$)
              </label>
              <input
                type="number"
                id="orcamento"
                value={orcamento}
                onChange={(e) => setOrcamento(Number(e.target.value))}
                min="50"
                max="1000"
                step="10"
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor mínimo: R$ 50,00
              </p>
            </div>

            <div>
              <label htmlFor="textoAnuncio" className="block mb-2">
                Texto do Anúncio
              </label>
              <textarea
                id="textoAnuncio"
                value={textoAnuncio}
                onChange={(e) => setTextoAnuncio(e.target.value)}
                placeholder="Descreva seu anúncio de forma atrativa"
                className="w-full p-2 border border-gray-300 rounded-md h-24"
                required
              />
            </div>
          </div>
        </div>

        {/* Upload de Imagem/Vídeo ou Link */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Mídia do Anúncio</h3>
          <p className="text-sm text-gray-500">
            Escolha uma das opções abaixo para adicionar ao seu anúncio.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload de Imagem */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="font-medium mb-2">Upload de Imagem</h4>
              <div className="space-y-4">
                <input
                  type="file"
                  id="imagemVideo"
                  accept="image/*,video/*"
                  onChange={handleImagemVideoChange}
                  className="hidden"
                />
                <label
                  htmlFor="imagemVideo"
                  className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-md text-center cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-gray-400 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-gray-600">
                      Clique para fazer upload
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      JPG, PNG ou GIF (máx. 5MB)
                    </span>
                  </div>
                </label>

                {imagemPreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                    <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={imagemPreview}
                        alt="Pré-visualização"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagemVideo(null);
                          setImagemPreview('');
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Link da Publicação */}
            <div className="border border-gray-200 rounded-md p-4">
              <h4 className="font-medium mb-2">Link do Cardápio ou Publicação</h4>
              <div className="space-y-4">
                <div>
                  <label htmlFor="linkPublicacao" className="block mb-2 text-sm">
                    Cole o link do seu cardápio ou de uma publicação existente
                  </label>
                  <input
                    type="url"
                    id="linkPublicacao"
                    value={linkPublicacao}
                    onChange={(e) => setLinkPublicacao(e.target.value)}
                    placeholder="https://exemplo.com/cardapio"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  O link deve ser público e acessível para todos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setNomeCampanha('');
              setOrcamento(70);
              setRaioAlcance(5);
              setLinkPublicacao('');
              setTextoAnuncio('');
              setImagemVideo(null);
              setImagemPreview('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processando...
              </>
            ) : (
              'Criar Anúncio'
            )}
          </button>
        </div>

        {/* Mensagens de Erro e Sucesso */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            <div className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
            <div className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div className="flex-1">
                <p className="font-medium">Anúncio criado com sucesso!</p>
                <p className="text-sm mt-1">
                  Seu anúncio foi enviado para o Meta Ads e começará a ser
                  exibido em breve.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="text-green-700 hover:text-green-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CampanhaManual;
