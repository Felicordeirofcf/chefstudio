import React, { useState, useEffect } from 'react';
import { createCampaign, uploadCampaignMedia } from '../lib/api';

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

  // Buscar informações do usuário ao carregar o componente
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsedInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedInfo);
        setIsMetaConnected(parsedInfo.isMetaConnected || parsedInfo.metaConnectionStatus === "connected");
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
    }
  }, []);

  // Inicializar o mapa quando o componente montar
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
          // Inicializar o mapa
          const mapInstance = window.L.map('map-container').setView([-23.5505, -46.6333], 12);
          
          // Adicionar camada de tiles
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapInstance);
          
          // Adicionar círculo para representar o raio
          const circleInstance = window.L.circle([-23.5505, -46.6333], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.2,
            radius: raioAlcance * 1000 // Converter para metros
          }).addTo(mapInstance);
          
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

  // Função para conectar com Meta Ads
  const handleConnectMeta = () => {
    // Usar o endpoint correto conforme mostrado no Swagger UI
    window.location.href = "https://chefstudio-production.up.railway.app/api/auth/meta-connect";
  };

  // Função para criar a campanha
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nomeCampanha || !orcamento || !textoAnuncio || (!linkPublicacao && !imagemVideo)) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário está autenticado
      const token = localStorage.getItem('token') || (userInfo && userInfo.token);
      if (!token) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      // Preparar dados para envio
      const campaignData = {
        name: nomeCampanha,
        budget: orcamento,
        radius: raioAlcance,
        adText: textoAnuncio,
        postUrl: linkPublicacao || ''
      };

      // Usar a função correta da API para criar campanha
      const response = await createCampaign(campaignData);

      // Se houver imagem/vídeo, fazer upload separado
      if (imagemVideo && response.id) {
        const campaignId = response.id || response._id;
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
      
      // Tratamento específico para erro 405 Method Not Allowed
      if (error.response && error.response.status === 405) {
        setError('Erro no servidor: método não permitido. Por favor, entre em contato com o suporte.');
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
            <div className="mt-4">
              <label className="block mb-2">
                Raio de Alcance ({raioAlcance} Km)
              </label>
              <input
                type="range"
                value={raioAlcance}
                onChange={(e) => setRaioAlcance(parseInt(e.target.value))}
                min="1"
                max="50"
                className="w-full"
              />
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

        {/* Upload de Imagem/Vídeo */}
        <div className="p-4 border rounded-md">
          <h3 className="text-sm font-semibold mb-2">
            Imagem/Vídeo para o Anúncio
          </h3>
          
          <label htmlFor="imagem-video-upload" className="inline-block">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer">
              Selecionar Arquivo
            </span>
            <input
              id="imagem-video-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleImagemVideoChange}
              className="hidden"
            />
          </label>
          
          {imagemPreview && (
            <div className="mt-4 text-center">
              <img 
                src={imagemPreview} 
                alt="Preview" 
                className="max-w-full max-h-[200px] mx-auto" 
              />
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
