import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from "../hooks/use-toast"; // Importar useToast

// Componente Select reutilizável
const SelectInput = ({ id, label, value, onChange, options, placeholder, required, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label} {required && '*'}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full p-2 border rounded-md bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      required={required}
      disabled={disabled || options.length === 0}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {options.length === 0 && !disabled && <p className="text-xs text-red-500 mt-1">Nenhuma opção disponível.</p>}
  </div>
);

// Componente para exibir uma campanha
const CampanhaItem = ({ campanha, onVerAds }) => {
  // Formatar data para exibição
  const formatarData = (dataString) => {
    try {
      const data = new Date(dataString);
      return data.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Determinar a cor do status
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-md p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{campanha.name}</h3>
          <div className="text-sm text-gray-500 mt-1">
            Criada em: {formatarData(campanha.startDate)}
          </div>
        </div>
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campanha.status)}`}>
            {campanha.status === 'ACTIVE' ? 'Ativo' : 
             campanha.status === 'PAUSED' ? 'Pausado' : 
             campanha.status === 'DELETED' ? 'Excluído' : campanha.status}
          </span>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <div className="text-sm">
          <span className="font-medium">Orçamento:</span> R$ {campanha.weeklyBudget?.toFixed(2) || campanha.dailyBudget?.toFixed(2) || '0.00'} 
          {campanha.weeklyBudget ? '/semana' : '/dia'}
        </div>
        
        <button 
          onClick={() => onVerAds(campanha)}
          className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          Ver no Ads
        </button>
      </div>
    </div>
  );
};

const CampanhaManual = () => {
  const { toast } = useToast();

  // Estados do formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkCardapio, setLinkCardapio] = useState('');
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [tituloAnuncio, setTituloAnuncio] = useState('');
  const [descricaoAnuncio, setDescricaoAnuncio] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  const [objective, setObjective] = useState('POST_ENGAGEMENT'); // Valor padrão alterado para POST_ENGAGEMENT

  // Estados Meta
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isMetaConnected, setIsMetaConnected] = useState(false); // Estado para controlar a conexão
  const [metaLoading, setMetaLoading] = useState(true); // Estado para carregamento dos dados Meta

  // Estados para listagem de campanhas
  const [campanhas, setCampanhas] = useState([]);
  const [carregandoCampanhas, setCarregandoCampanhas] = useState(false);
  const [erroCampanhas, setErroCampanhas] = useState(null);

  // Estados do mapa
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [circle, setCircle] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: -23.5505, lng: -46.6333 });

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para controle de campos avançados
  const [mostrarCamposAvancados, setMostrarCamposAvancados] = useState(false);

  // Definir data de início padrão
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  // Buscar status da conexão Meta
  useEffect(() => {
    const fetchMetaStatus = async () => {
      setMetaLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn("Token não encontrado, usuário não autenticado.");
          setIsMetaConnected(false);
          setMetaLoading(false);
          return;
        }

        const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
        const response = await axios.get(`${API_BASE_URL}/meta/connection-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // *** CORREÇÃO: Usar os nomes corretos retornados pela API ***
        const { isConnected, adAccounts, metaPages } = response.data;
        console.log("Resposta de /api/meta/connection-status:", response.data);

        setIsMetaConnected(isConnected); // isConnected já é boolean

        if (isConnected) {
          // *** CORREÇÃO: Usar 'adAccounts' e 'metaPages' ***
          if (adAccounts && adAccounts.length > 0) {
            setAdAccountsList(adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
            if (!selectedAdAccount || !adAccounts.some(acc => acc.id === selectedAdAccount)) {
              setSelectedAdAccount(adAccounts[0].id);
            }
          } else {
            setAdAccountsList([]);
            setSelectedAdAccount('');
            console.warn("Nenhuma conta de anúncios encontrada via API.");
          }

          if (metaPages && metaPages.length > 0) {
            setPagesList(metaPages.map(page => ({ value: page.id, label: `${page.name} (${page.id})` })));
            if (!selectedPage || !metaPages.some(page => page.id === selectedPage)) {
              setSelectedPage(metaPages[0].id);
            }
          } else {
            setPagesList([]);
            setSelectedPage('');
            console.warn("Nenhuma página do Facebook encontrada via API.");
          }
        } else {
          setAdAccountsList([]);
          setPagesList([]);
          setSelectedAdAccount('');
          setSelectedPage('');
        }

      } catch (error) {
        console.error('Erro ao buscar status da conexão Meta:', error.response?.data || error.message);
        setError('Erro ao verificar conexão com Meta Ads. Tente recarregar a página.');
        setIsMetaConnected(false);
        setAdAccountsList([]);
        setPagesList([]);
        setSelectedAdAccount('');
        setSelectedPage('');
      } finally {
        setMetaLoading(false);
      }
    };

    fetchMetaStatus();
  }, []);

  // Buscar campanhas quando a conta de anúncios for selecionada
  useEffect(() => {
    if (selectedAdAccount && isMetaConnected) {
      buscarCampanhas();
    }
  }, [selectedAdAccount, isMetaConnected]);

  // Função para buscar campanhas
  const buscarCampanhas = async () => {
    if (!selectedAdAccount || !isMetaConnected) return;
    
    setCarregandoCampanhas(true);
    setErroCampanhas(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }
      
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      const response = await axios.get(`${API_BASE_URL}/meta-ads/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { adAccountId: selectedAdAccount }
      });
      
      if (response.data && response.data.campaigns) {
        setCampanhas(response.data.campaigns);
      } else {
        setCampanhas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error.response?.data || error.message);
      setErroCampanhas('Não foi possível carregar as campanhas. Tente novamente mais tarde.');
      setCampanhas([]);
    } finally {
      setCarregandoCampanhas(false);
    }
  };

  // Inicializar o mapa
  useEffect(() => {
    let mapInstance = null;
    let circleInstance = null;

    const initMap = (lat, lng) => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer && window.L && !map) {
        mapInstance = window.L.map(mapContainer).setView([lat, lng], 12);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        circleInstance = window.L.circle([lat, lng], {
          color: 'blue',
          fillColor: '#30f',
          fillOpacity: 0.2,
          radius: raioAlcance * 1000
        }).addTo(mapInstance);

        setMap(mapInstance);
        setCircle(circleInstance);
        setCurrentLocation({ lat, lng });
        setMapLoaded(true);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          initMap(latitude, longitude);
        },
        (error) => {
          console.warn("Erro ao obter geolocalização, usando padrão SP:", error);
          initMap(-23.5505, -46.6333);
        }
      );
    } else {
      console.warn("Geolocalização não suportada, usando padrão SP.");
      initMap(-23.5505, -46.6333);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      document.head.appendChild(script);

      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Atualizar o raio do círculo
  useEffect(() => {
    if (circle) {
      circle.setRadius(raioAlcance * 1000);
    }
  }, [raioAlcance, circle]);

  // Função para abrir o anúncio no Ads Manager
  const handleVerAds = (campanha) => {
    // URL do Ads Manager com o ID da campanha
    const adsManagerUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedAdAccount}&selected_campaign_ids=${campanha.campaignId}`;
    window.open(adsManagerUrl, '_blank');
  };

  // Função para limpar o formulário
  const limparFormulario = () => {
    setNomeCampanha('');
    setOrcamento(70);
    setLinkCardapio('');
    setLinkPublicacao('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setDataTermino('');
    setTituloAnuncio('');
    setDescricaoAnuncio('');
    setCallToAction('LEARN_MORE');
    setObjective('POST_ENGAGEMENT'); // Limpar o objetivo para o valor padrão
  };

  // Função para criar a campanha
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isMetaConnected) {
      setError('Conecte sua conta Meta Ads para criar anúncios.');
      toast({ title: "Erro", description: "Conecte sua conta Meta Ads para criar anúncios.", variant: "destructive" });
      return;
    }

    if (!selectedAdAccount) {
      setError('Selecione uma Conta de Anúncios.');
      toast({ title: "Erro", description: "Selecione uma Conta de Anúncios.", variant: "destructive" });
      return;
    }
    if (!selectedPage) {
      setError('Selecione uma Página do Facebook.');
       toast({ title: "Erro", description: "Selecione uma Página do Facebook.", variant: "destructive" });
      return;
    }
    if (!nomeCampanha || !orcamento || !dataInicio || !linkPublicacao || !callToAction) {
      setError('Preencha todos os campos obrigatórios (*).');
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios (*).", variant: "destructive" });
      return;
    }
    if (dataTermino && new Date(dataTermino) <= new Date(dataInicio)) {
      setError('A data de término deve ser posterior à data de início.');
      toast({ title: "Erro", description: "A data de término deve ser posterior à data de início.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      
      // Usar o endpoint para criar anúncio a partir de publicação existente
      const endpoint = `${API_BASE_URL}/meta-ads/create-from-post`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const dataToSend = {
        adAccountId: selectedAdAccount,
        pageId: selectedPage,
        campaignName: nomeCampanha,
        weeklyBudget: parseFloat(orcamento),
        startDate: dataInicio,
        endDate: dataTermino || null,
        location: {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          radius: parseInt(raioAlcance)
        },
        postUrl: linkPublicacao,
        callToAction: callToAction,
        menuUrl: linkCardapio || null,
        adTitle: tituloAnuncio || null,
        adDescription: descricaoAnuncio || null,
        objective: objective
      };

      console.log('Enviando dados para criação de anúncio:', dataToSend);
      const response = await axios.post(endpoint, dataToSend, { headers });

      console.log('Resposta da criação de anúncio:', response.data);
      
      // Adicionar a campanha à lista local
      if (response.data.adDetails) {
        setCampanhas(prev => [response.data.adDetails, ...prev]);
      }
      
      toast({ 
        title: "Sucesso!", 
        description: "Anúncio criado com sucesso e publicado como ACTIVE", 
      });
      
      // Limpar o formulário após sucesso
      limparFormulario();
      
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      
      let errorMsg = 'Erro ao criar anúncio. Tente novamente.';
      
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMsg = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : JSON.stringify(error.response.data.error);
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      toast({ title: "Erro ao criar campanha", description: errorMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ctaOptions = [
    { value: 'LEARN_MORE', label: 'Saiba Mais' },
    { value: 'BOOK_TRAVEL', label: 'Reservar' },
    { value: 'CONTACT_US', label: 'Entre em Contato' },
    { value: 'DOWNLOAD', label: 'Baixar' },
    { value: 'GET_QUOTE', label: 'Pedir Orçamento' },
    { value: 'SIGN_UP', label: 'Cadastre-se' },
    { value: 'SUBSCRIBE', label: 'Inscrever-se' },
    { value: 'SHOP_NOW', label: 'Comprar Agora' },
    { value: 'ORDER_NOW', label: 'Pedir Agora' }
  ];

  // Opções para o objetivo da campanha
  const objectiveOptions = [
    { value: 'POST_ENGAGEMENT', label: 'Engajamento em publicação' },
    { value: 'LINK_CLICKS', label: 'Cliques no link (tráfego)' },
    { value: 'LEAD_GENERATION', label: 'Geração de leads' },
    { value: 'OUTCOME_TRAFFIC', label: 'Tráfego (novo)' },
    { value: 'OUTCOME_LEADS', label: 'Leads (novo)' },
    { value: 'CONVERSIONS', label: 'Conversões' }
  ];

  return (
    <div className="w-full space-y-8">
      {/* Formulário de criação de anúncio */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-semibold">
            Criar Anúncio Manualmente
          </h2>
          <p className="text-sm text-gray-500">
            Configure sua campanha de tráfego com as opções recomendadas pelo Meta Ads.
          </p>

          {metaLoading && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
              Verificando conexão com Meta Ads...
            </div>
          )}
          {!metaLoading && !isMetaConnected && (
             <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
               Conecte sua conta Meta Ads no seu perfil para criar anúncios.
             </div>
          )}
          {error && (
             <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
               {error}
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <SelectInput
               id="adAccount"
               label="Conta de Anúncios Meta"
               value={selectedAdAccount}
               onChange={(e) => setSelectedAdAccount(e.target.value)}
               options={adAccountsList}
               placeholder={metaLoading ? "Carregando..." : "Selecione a Conta"}
               required
               disabled={metaLoading || !isMetaConnected || adAccountsList.length === 0}
             />
             <SelectInput
               id="facebookPage"
               label="Página do Facebook"
               value={selectedPage}
               onChange={(e) => setSelectedPage(e.target.value)}
               options={pagesList}
               placeholder={metaLoading ? "Carregando..." : "Selecione a Página"}
               required
               disabled={metaLoading || !isMetaConnected || pagesList.length === 0}
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div>
                <label htmlFor="nomeCampanha" className="block text-sm font-medium mb-1">Nome da Campanha *</label>
                <input
                  type="text"
                  id="nomeCampanha"
                  value={nomeCampanha}
                  onChange={(e) => setNomeCampanha(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!isMetaConnected}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="orcamento" className="block text-sm font-medium mb-1">Orçamento Semanal (R$) *</label>
                <input
                  type="number"
                  id="orcamento"
                  value={orcamento}
                  onChange={(e) => setOrcamento(parseFloat(e.target.value))}
                  className="w-full p-2 border rounded-md"
                  min="70" // Orçamento mínimo fixo de R$ 70
                  required
                  disabled={!isMetaConnected}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo recomendado: R$70.</p>
              </div>
              
              <div className="mt-4">
                <label htmlFor="dataInicio" className="block text-sm font-medium mb-1">Data de Início *</label>
                <input
                  type="date"
                  id="dataInicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!isMetaConnected}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="linkPublicacao" className="block text-sm font-medium mb-1">Link da Publicação Existente *</label>
                <input
                  type="url"
                  id="linkPublicacao"
                  value={linkPublicacao}
                  onChange={(e) => setLinkPublicacao(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="https://www.facebook.com/pagina/posts/123..."
                  required
                  disabled={!isMetaConnected}
                />
              </div>
              
              <div className="mt-4">
                <SelectInput
                  id="callToAction"
                  label="Botão de Ação (Call to Action) *"
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  options={ctaOptions}
                  placeholder="Selecione o CTA"
                  required
                  disabled={!isMetaConnected}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div
                id="map-container"
                className="relative h-[300px] bg-gray-100 rounded-md overflow-hidden border"
                style={{ width: '100%', height: '300px' }}
              >
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={() => setMostrarCamposAvancados(!mostrarCamposAvancados)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                {mostrarCamposAvancados ? 'Ocultar configurações avançadas' : 'Mostrar configurações avançadas'}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 transition-transform ${mostrarCamposAvancados ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {mostrarCamposAvancados && (
                <div className="space-y-4 border-t pt-4 mt-2">
                  <div>
                    <label htmlFor="dataTermino" className="block text-sm font-medium mb-1">Data de Término (opcional)</label>
                    <input
                      type="date"
                      id="dataTermino"
                      value={dataTermino}
                      onChange={(e) => setDataTermino(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      min={dataInicio}
                      disabled={!isMetaConnected}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="tituloAnuncio" className="block text-sm font-medium mb-1">Título do Anúncio (opcional)</label>
                    <input
                      type="text"
                      id="tituloAnuncio"
                      value={tituloAnuncio}
                      onChange={(e) => setTituloAnuncio(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      disabled={!isMetaConnected}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="descricaoAnuncio" className="block text-sm font-medium mb-1">Descrição do Anúncio (opcional)</label>
                    <textarea
                      id="descricaoAnuncio"
                      value={descricaoAnuncio}
                      onChange={(e) => setDescricaoAnuncio(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows="3"
                      placeholder="Ex: Venha experimentar nossos pratos especiais com 20% de desconto!"
                      disabled={!isMetaConnected}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="raioAlcanceSlider" className="block mb-2 text-sm font-medium">
                      Raio de Alcance ({raioAlcance} Km)
                    </label>
                    <input
                      id="raioAlcanceSlider"
                      type="range"
                      min="1"
                      max="50"
                      value={raioAlcance}
                      onChange={(e) => setRaioAlcance(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      disabled={!isMetaConnected}
                    />
                  </div>
                  
                  <SelectInput
                    id="objective"
                    label="Objetivo da Campanha"
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    options={objectiveOptions}
                    placeholder="Selecione o objetivo"
                    required
                    disabled={!isMetaConnected}
                  />
                  
                  <div>
                    <label htmlFor="linkCardapio" className="block text-sm font-medium mb-1">Link de Destino (opcional)</label>
                    <input
                      type="url"
                      id="linkCardapio"
                      value={linkCardapio}
                      onChange={(e) => setLinkCardapio(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="https://seurestaurante.com/cardapio"
                      disabled={!isMetaConnected}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || metaLoading || !isMetaConnected}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              ) : (
                'Criar Anúncio no Meta Ads'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Seção de campanhas criadas */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Campanhas Criadas</h2>
          <button 
            onClick={buscarCampanhas}
            className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center"
            disabled={carregandoCampanhas || !isMetaConnected || !selectedAdAccount}
          >
            {carregandoCampanhas ? (
              <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Atualizar
          </button>
        </div>
        
        {erroCampanhas && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4">
            {erroCampanhas}
          </div>
        )}
        
        {carregandoCampanhas ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : campanhas.length > 0 ? (
          <div className="space-y-2">
            {campanhas.map((campanha, index) => (
              <CampanhaItem key={campanha.id || index} campanha={campanha} onVerAds={handleVerAds} />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">Nenhuma campanha encontrada para esta conta.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampanhaManual;
