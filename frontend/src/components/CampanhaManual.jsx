import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from "../hooks/use-toast";

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
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [linkPublicacaoError, setLinkPublicacaoError] = useState('');
  const [linkPublicacaoProcessado, setLinkPublicacaoProcessado] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');

  // Estados Meta
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

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

        const { isConnected, adAccounts, metaPages } = response.data;
        console.log("Resposta de /api/meta/connection-status:", response.data);

        setIsMetaConnected(isConnected);

        if (isConnected) {
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
          radius: 10 * 1000 // Raio fixo de 10km
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

  // Função para validar e processar o formato do link da publicação
  const validarEProcessarLinkPublicacao = (link) => {
    if (!link) return { valido: false, mensagem: "Link da publicação é obrigatório", linkProcessado: "" };
    
    try {
      const url = new URL(link);
      
      // Verificar se é um link do Facebook
      if (!url.hostname.includes('facebook.com')) {
        return {
          valido: false,
          mensagem: "O link deve ser do Facebook (facebook.com)",
          linkProcessado: ""
        };
      }
      
      // Verificar se está no formato correto: /{page_id}/posts/{post_id}
      const regexPostsFormat = /facebook\.com\/(\d+)\/posts\/(\d+)/;
      const matchPosts = link.match(regexPostsFormat);
      
      if (matchPosts) {
        // Já está no formato correto
        return {
          valido: true,
          mensagem: "",
          linkProcessado: link
        };
      }
      
      // Verificar se é um permalink e extrair page_id e story_fbid
      const isPermalink = url.pathname.includes('/permalink.php');
      if (isPermalink) {
        const pageId = url.searchParams.get('id');
        let storyFbid = url.searchParams.get('story_fbid');
        
        // Verificar se o story_fbid começa com "pfbid", nesse caso extrair o ID real
        if (storyFbid && storyFbid.startsWith('pfbid')) {
          // Usar o próprio pfbid como ID, já que o Meta Ads pode processá-lo
          // ou alternativamente, manter o formato original do permalink
          return {
            valido: true,
            mensagem: "Link de permalink convertido para formato compatível",
            linkProcessado: link // Manter o permalink original, o backend lidará com isso
          };
        }
        
        if (pageId && storyFbid) {
          // Converter para o formato correto
          const linkProcessado = `https://www.facebook.com/${pageId}/posts/${storyFbid}`;
          return {
            valido: true,
            mensagem: "Link de permalink convertido para formato compatível",
            linkProcessado: linkProcessado
          };
        }
      }
      
      // Rejeitar outros formatos com mensagem específica
      if (url.pathname.includes('/share/p/')) {
        return {
          valido: false,
          mensagem: "Links de compartilhamento (share/p/) não são aceitos pelo Meta Ads. Use o link direto da publicação.",
          linkProcessado: ""
        };
      }
      
      if (url.pathname.includes('/photo') || url.searchParams.has('fbid')) {
        return {
          valido: false,
          mensagem: "Links de foto (photo?fbid=) não são aceitos pelo Meta Ads neste formato. Use o link direto da publicação.",
          linkProcessado: ""
        };
      }
      
      // Mensagem genérica para outros formatos
      return {
        valido: false,
        mensagem: "Formato de link não suportado. Por favor, insira o link direto da publicação clicando no horário do post na sua página do Facebook. O link deve estar no formato facebook.com/{page_id}/posts/{post_id} ou usar o formato permalink.",
        linkProcessado: ""
      };
    } catch (error) {
      return {
        valido: false,
        mensagem: "URL inválida. Verifique se o link está completo e correto.",
        linkProcessado: ""
      };
    }
  };

  // Handler para mudança no link da publicação
  const handleLinkPublicacaoChange = (e) => {
    const link = e.target.value;
    setLinkPublicacao(link);
    
    if (link) {
      const validacao = validarEProcessarLinkPublicacao(link);
      setLinkPublicacaoError(validacao.valido ? "" : validacao.mensagem);
      setLinkPublicacaoProcessado(validacao.linkProcessado);
      
      if (validacao.valido && validacao.mensagem) {
        // Mostrar toast informativo se o link foi convertido
        toast({ 
          title: "Link processado", 
          description: validacao.mensagem,
        });
      }
    } else {
      setLinkPublicacaoError("");
      setLinkPublicacaoProcessado("");
    }
  };

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
    setLinkPublicacao('');
    setLinkPublicacaoError('');
    setLinkPublicacaoProcessado('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setDataTermino('');
    setCallToAction('LEARN_MORE');
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
    if (!nomeCampanha || !orcamento || !linkPublicacao || !callToAction) {
      setError('Preencha todos os campos obrigatórios (*).');
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios (*).", variant: "destructive" });
      return;
    }
    
    // Validar formato do link da publicação
    const validacaoLink = validarEProcessarLinkPublicacao(linkPublicacao);
    if (!validacaoLink.valido) {
      setError(validacaoLink.mensagem);
      setLinkPublicacaoError(validacaoLink.mensagem);
      toast({ title: "Erro", description: validacaoLink.mensagem, variant: "destructive" });
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

      // Usar o link processado se disponível, caso contrário usar o link original
      const linkFinal = validacaoLink.linkProcessado || linkPublicacao;

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
          radius: 10 // Raio fixo de 10km
        },
        postUrl: linkFinal,
        callToAction: callToAction
        // Não enviamos objective, será definido no backend
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
      
      // Verificar se é um erro específico de post não elegível
      if (error.response?.data?.error?.error_subcode === 1487472) {
        errorMsg = "Esta publicação não pode ser promovida em um anúncio. Possíveis razões: a publicação não é pública, é muito antiga, ou contém conteúdo não elegível para anúncios. Por favor, escolha outra publicação.";
      }
      
      setError(errorMsg);
      toast({ title: "Erro ao criar campanha", description: errorMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ctaOptions = [
    { value: 'LEARN_MORE', label: 'Saiba Mais' },
    { value: 'MESSAGE_PAGE', label: 'Enviar Mensagem' },
    { value: 'SHOP_NOW', label: 'Comprar Agora' },
    { value: 'BOOK_TRAVEL', label: 'Reservar' },
    { value: 'CONTACT_US', label: 'Entre em Contato' },
    { value: 'SIGN_UP', label: 'Cadastre-se' },
    { value: 'GET_OFFER', label: 'Ver Oferta' }
  ];

  return (
    <div className="w-full space-y-8">
      {/* Formulário de criação de anúncio */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-xl font-semibold">
            Criar Anúncio
          </h2>
          <p className="text-sm text-gray-500">
            Impulsione uma publicação existente do Facebook ou Instagram.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            </div>

            <div className="space-y-4">
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
              
              <div>
                <label htmlFor="orcamento" className="block text-sm font-medium mb-1">Valor a Investir (R$) *</label>
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
                <p className="text-xs text-gray-500 mt-1">Mínimo recomendado: R$70 por semana.</p>
              </div>
              
              <div>
                <label htmlFor="linkPublicacao" className="block text-sm font-medium mb-1">Link da Publicação Existente *</label>
                <input
                  type="url"
                  id="linkPublicacao"
                  value={linkPublicacao}
                  onChange={handleLinkPublicacaoChange}
                  className={`w-full p-2 border rounded-md ${linkPublicacaoError ? 'border-red-500' : ''}`}
                  placeholder="https://www.facebook.com/123456789/posts/987654321"
                  required
                  disabled={!isMetaConnected}
                />
                {linkPublicacaoError && (
                  <p className="text-xs text-red-500 mt-1">{linkPublicacaoError}</p>
                )}
                {linkPublicacaoProcessado && !linkPublicacaoError && (
                  <p className="text-xs text-green-500 mt-1">Link válido e processado com sucesso!</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  A publicação deve estar pública. Formatos aceitos:
                  <br />- facebook.com/página/posts/id
                  <br />- facebook.com/permalink.php?story_fbid=...&id=...
                </p>
              </div>
              
              <SelectInput
                id="callToAction"
                label="Botão de Ação *"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                options={ctaOptions}
                placeholder="Selecione o botão"
                required
                disabled={!isMetaConnected}
              />
              
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
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || metaLoading || !isMetaConnected || !!linkPublicacaoError}
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
                  ) : (
                    'Criar Anúncio'
                  )}
                </button>
              </div>
            </div>
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
