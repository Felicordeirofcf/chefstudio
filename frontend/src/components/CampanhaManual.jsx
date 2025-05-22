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

  // Verificar se há token do Facebook na URL (após redirecionamento)
  useEffect(() => {
    const checkFacebookRedirect = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const error = urlParams.get('error');
      
      if (accessToken) {
        // Salvar token do Facebook
        const metaInfo = {
          accessToken,
          connectedAt: new Date().toISOString(),
          isMetaConnected: true
        };
        
        // Atualizar localStorage
        try {
          const userInfoStr = localStorage.getItem('userInfo');
          if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            const updatedUserInfo = {
              ...userInfo,
              metaAccessToken: accessToken,
              metaConnectionStatus: "connected",
              isMetaConnected: true
            };
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
            setUserInfo(updatedUserInfo);
            setIsMetaConnected(true);
          }
          
          // Salvar informações do Meta separadamente
          localStorage.setItem('metaInfo', JSON.stringify(metaInfo));
          
          // Limpar URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Erro ao salvar token do Facebook:', error);
        }
      } else if (error) {
        setError(`Erro na autenticação com Facebook: ${error}`);
      }
    };
    
    checkFacebookRedirect();
  }, []);

  // Buscar informações do usuário ao carregar o componente
  useEffect(() => {
    const checkMetaConnection = () => {
      try {
        console.log("CampanhaManual: Verificando status de conexão Meta");
        
        // Verificar se há informações do Meta salvas
        const metaInfoStr = localStorage.getItem('metaInfo');
        if (metaInfoStr) {
          const metaInfo = JSON.parse(metaInfoStr);
          console.log("CampanhaManual: metaInfo encontrado:", metaInfo);
          if (metaInfo.accessToken || metaInfo.isConnected) {
            console.log("CampanhaManual: Meta conectado via metaInfo");
            setIsMetaConnected(true);
            return true;
          }
        }
        
        // Verificar informações do usuário
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsedInfo = JSON.parse(storedUserInfo);
          console.log("CampanhaManual: userInfo encontrado:", {
            isMetaConnected: parsedInfo.isMetaConnected,
            metaConnectionStatus: parsedInfo.metaConnectionStatus,
            hasMetaToken: !!parsedInfo.metaAccessToken
          });
          
          const connected = (
            parsedInfo.isMetaConnected || 
            parsedInfo.metaConnectionStatus === "connected" ||
            parsedInfo.metaAccessToken
          );
          
          setUserInfo(parsedInfo);
          setIsMetaConnected(connected);
          
          if (connected) {
            console.log("CampanhaManual: Meta conectado via userInfo");
          }
          
          return connected;
        }
        
        // Verificar URL para parâmetros de redirecionamento
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const accessToken = urlParams.get('access_token');
        
        if (code || accessToken) {
          console.log("CampanhaManual: Parâmetros de autenticação encontrados na URL");
          setIsMetaConnected(true);
          
          // Salvar informações simuladas para garantir que o estado seja mantido
          localStorage.setItem('metaInfo', JSON.stringify({
            isConnected: true,
            connectedAt: new Date().toISOString(),
            accessToken: accessToken || `meta_token_${Date.now()}`
          }));
          
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        return false;
      }
    };

    // Verificar status inicial
    const initialStatus = checkMetaConnection();
    console.log("CampanhaManual: Status inicial de conexão:", initialStatus);
    
    // Forçar verificação após um pequeno delay para garantir que localStorage foi atualizado
    setTimeout(() => {
      const delayedStatus = checkMetaConnection();
      console.log("CampanhaManual: Status após delay:", delayedStatus);
      
      // Se ainda não estiver conectado, verificar novamente após um delay maior
      if (!delayedStatus) {
        setTimeout(() => {
          const finalCheck = checkMetaConnection();
          console.log("CampanhaManual: Verificação final:", finalCheck);
        }, 2000);
      }
    }, 500);
    
    // Adicionar listener para o evento personalizado de atualização da conexão Meta
    const handleMetaConnectionUpdate = (event) => {
      console.log("CampanhaManual: Evento de atualização de conexão Meta detectado", event.detail);
      const isConnected = checkMetaConnection();
      console.log("CampanhaManual: Status de conexão atualizado:", isConnected);
      
      // Forçar atualização do estado
      setIsMetaConnected(isConnected);
    };
    
    // Adicionar listener para mudanças no localStorage
    const handleStorageChange = (event) => {
      if (event.key === 'metaInfo' || event.key === 'userInfo') {
        console.log("CampanhaManual: Mudança detectada no localStorage:", event.key);
        const isConnected = checkMetaConnection();
        console.log("CampanhaManual: Status de conexão após mudança no storage:", isConnected);
      }
    };
    
    window.addEventListener('metaConnectionUpdated', handleMetaConnectionUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    // Também verificar periodicamente para garantir
    const intervalId = setInterval(() => {
      checkMetaConnection();
    }, 1500);
    
    // Limpar listeners ao desmontar
    return () => {
      window.removeEventListener('metaConnectionUpdated', handleMetaConnectionUpdate);
      window.removeEventListener('storage', handleStorageChange);
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
                <span>1km</span>
                <span>2km</span>
                <span>3km</span>
                <span>4km</span>
                <span>5km</span>
                <span>6km</span>
                <span>7km</span>
              </div>
            </div>
          </div>

          {/* Lado direito - Formulário Simplificado */}
          <div className="space-y-4">
            <div>
              <label htmlFor="nomeCampanha" className="block text-sm font-medium mb-1">
                Nome da Campanha *
              </label>
              <input
                id="nomeCampanha"
                type="text"
                value={nomeCampanha}
                onChange={(e) => setNomeCampanha(e.target.value)}
                placeholder="Ex: Campanha de Verão"
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="orcamento" className="block text-sm font-medium mb-1">
                Orçamento semanal (R$) *
              </label>
              <input
                id="orcamento"
                type="number"
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                min="10"
                className="w-full p-2 border rounded-md"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Para melhores resultados recomendamos um orçamento mínimo semanal de R$70.
              </p>
            </div>
            
            <div>
              <label htmlFor="linkPublicacao" className="block text-sm font-medium mb-1">
                Link da Publicação
              </label>
              <input
                id="linkPublicacao"
                type="text"
                value={linkPublicacao}
                onChange={(e) => setLinkPublicacao(e.target.value)}
                placeholder="https://facebook.com/suapagina/posts/123..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Texto do Anúncio */}
        <div>
          <label htmlFor="textoAnuncio" className="block text-sm font-medium mb-1">
            Texto do Anúncio *
          </label>
          <textarea
            id="textoAnuncio"
            value={textoAnuncio}
            onChange={(e) => setTextoAnuncio(e.target.value)}
            placeholder="Ex: Promoção especial esta semana!"
            className="w-full p-2 border rounded-md"
            rows="3"
            required
          />
        </div>

        {/* Upload de Imagem/Vídeo ou Link do Cardápio - Simplificado */}
        <div className="p-6 border rounded-md bg-gray-50">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Adicione seu Cardápio ou Imagem
          </h3>
          
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-md">
              <div className="text-center mb-2 text-gray-700">Opção 1: Faça upload da foto do cardápio</div>
              <div className="flex justify-center">
                <label htmlFor="imagem-video-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="mb-1 text-sm text-gray-500">Clique para selecionar</p>
                    <p className="text-xs text-gray-500">PNG, JPG ou JPEG</p>
                  </div>
                  <input
                    id="imagem-video-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImagemVideoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            <div className="text-center text-gray-500">- OU -</div>
            
            <div className="w-full max-w-md">
              <div className="text-center mb-2 text-gray-700">Opção 2: Cole o link do cardápio ou publicação</div>
              <input
                id="linkPublicacao"
                type="text"
                value={linkPublicacao}
                onChange={(e) => setLinkPublicacao(e.target.value)}
                placeholder="https://facebook.com/suapagina/posts/123... ou link do cardápio"
                className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {imagemPreview && (
            <div className="mt-6 text-center">
              <p className="text-green-600 font-medium mb-2">Imagem selecionada:</p>
              <div className="relative inline-block">
                <img 
                  src={imagemPreview} 
                  alt="Preview" 
                  className="max-w-full max-h-[200px] mx-auto rounded-lg border border-gray-200 shadow-sm" 
                />
                <button 
                  onClick={() => {setImagemVideo(null); setImagemPreview('');}}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Botão de Envio */}
        <button 
          type="submit" 
          className="w-full py-3 bg-blue-600 text-white rounded-md font-medium"
          disabled={loading}
        >
          {loading ? 'Processando...' : 'Criar Anúncio no Meta Ads'}
        </button>

        {/* Mensagem de sucesso */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            Anúncio criado com sucesso! Verifique a seção de produtos anunciados abaixo.
            <button 
              onClick={handleCloseSuccess}
              className="ml-2 text-sm underline"
            >
              Fechar
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default CampanhaManual;
