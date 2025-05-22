import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CampanhaManual = () => {
  // Estados para os campos do formulário (simplificados)
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkCardapio, setLinkCardapio] = useState('');
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [circle, setCircle] = useState(null);

  // Estados para controle de carregamento e erros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Buscar informações do usuário ao carregar o componente
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        setUserInfo(JSON.parse(storedUserInfo));
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

  // Função para criar a campanha
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nomeCampanha || !orcamento) {
      setError('Por favor, preencha o nome da campanha e o orçamento.');
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

      // Verificar se o usuário está conectado ao Meta Ads
      const userMetaStatus = userInfo?.metaConnectionStatus || 'disconnected';
      if (userMetaStatus !== 'connected') {
        throw new Error('Você precisa conectar sua conta ao Meta Ads antes de criar campanhas. Vá para seu perfil e conecte-se.');
      }

      // URL base correta para o backend
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";

      // Preparar dados para envio - formato corrigido conforme esperado pelo backend
      const campaignData = {
        // Campos obrigatórios
        campaignName: nomeCampanha,
        dailyBudget: parseFloat(orcamento) / 7, // Converter orçamento semanal para diário
        radius: raioAlcance,
        
        // Data de início (obrigatória) - usando data atual se não for especificada
        startDate: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        
        // Campos opcionais
        menuUrl: linkCardapio || null,
        postUrl: linkPublicacao || null,
        
        // Campos adicionais que podem ser necessários
        location: {
          latitude: -23.5505,
          longitude: -46.6333
        }
      };

      console.log('Enviando dados para criação de campanha:', campaignData);

      // Determinar qual endpoint usar com base nos dados fornecidos
      let endpoint = `${API_BASE_URL}/meta/create-ad-from-post`;
      
      // Se não tiver link de publicação, usar o endpoint de criação por imagem
      if (!linkPublicacao) {
        endpoint = `${API_BASE_URL}/meta/create-from-image`;
      }

      // Enviar dados da campanha para a API
      const response = await axios({
        method: 'post',
        url: endpoint,
        data: campaignData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Limpar formulário após sucesso
      setNomeCampanha('');
      setOrcamento(70);
      setRaioAlcance(5);
      setLinkCardapio('');
      setLinkPublicacao('');
      
      // Exibir mensagem de sucesso
      setSuccess(true);
      
      // Atualizar a lista de produtos anunciados
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('anuncioCreated', { detail: response.data }));
      }
      
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      
      // Tratamento específico para erro 400 Bad Request
      if (error.response && error.response.status === 400) {
        setError(`Erro no formato dos dados: ${error.response.data?.message || 'Verifique os campos e tente novamente.'}`);
      } else if (error.response && error.response.status === 401) {
        setError('Sessão expirada ou usuário não autenticado. Por favor, faça login novamente.');
        // Redirecionar para login após um breve delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(error.message || error.response?.data?.message || 'Erro ao criar campanha. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fechar alerta de sucesso
  const handleCloseSuccess = () => {
    setSuccess(false);
  };

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
              <label htmlFor="linkCardapio" className="block text-sm font-medium mb-1">
                Link do Cardápio
              </label>
              <input
                id="linkCardapio"
                type="text"
                value={linkCardapio}
                onChange={(e) => setLinkCardapio(e.target.value)}
                placeholder="https://seurestaurante.com/cardapio"
                className="w-full p-2 border rounded-md"
              />
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
