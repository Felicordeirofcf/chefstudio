import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from "../hooks/use-toast";

// Componente Select reutilizável com proteção na chamada onChange
const SelectInput = ({ id, label, value, onChange, options, placeholder, required, disabled }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label} {required && '*'}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => typeof onChange === 'function' && onChange(e)} // Proteção typeof
      className="w-full p-2 border rounded-md bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      required={required}
      disabled={disabled || !options || options.length === 0} // Adicionado !options
    >
      <option value="" disabled>{placeholder}</option>
      {/* Adicionado verificação se options é um array antes de mapear */}
      {Array.isArray(options) && options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {(!options || options.length === 0) && !disabled && <p className="text-xs text-red-500 mt-1">Nenhuma opção disponível.</p>}
  </div>
);

// Componente para exibir uma campanha com proteção na chamada onVerAds
const CampanhaItem = ({ campanha, onVerAds }) => {
  // Formatar data para exibição
  const formatarData = (dataString) => {
    try {
      if (!dataString) return 'Data não disponível';
      
      const data = new Date(dataString);
      // Verificar se a data é válida
      if (isNaN(data.getTime())) return 'Data não disponível';
      
      // Formatar como dd/mm/aaaa
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return 'Data não disponível';
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
          <h3 className="font-medium text-lg">{campanha?.name || 'Campanha sem nome'}</h3>
          <div className="text-sm text-gray-500 mt-1">
            Criada em: {formatarData(campanha?.startDate || campanha?.created_time)}
          </div>
        </div>
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campanha?.status)}`}>
            {campanha?.status === 'ACTIVE' ? 'Ativo' :
             campanha?.status === 'PAUSED' ? 'Pausado' :
             campanha?.status === 'DELETED' ? 'Excluído' : campanha?.status || 'Desconhecido'}
          </span>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <div className="text-sm">
          <span className="font-medium">Orçamento:</span> R$ {campanha?.weeklyBudget?.toFixed(2) || campanha?.dailyBudget?.toFixed(2) || '0.00'} 
          {campanha?.weeklyBudget ? '/semana' : '/dia'}
        </div>
        
        <button 
          onClick={() => typeof onVerAds === 'function' && onVerAds(campanha)} // Proteção typeof
          className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          Ver no Ads
        </button>
      </div>
    </div>
  );
};

// Componente de alerta de sucesso com proteção na chamada onClose
const SuccessAlert = ({ message, adsUrl, onClose }) => {
  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-lg z-50 animate-fade-in">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 w-full">
          <p className="text-sm font-medium text-green-800">
            🎉 {message}
          </p>
          {adsUrl && (
            <div className="mt-2">
              <a 
                href={adsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Ver no Ads Manager
              </a>
            </div>
          )}
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => typeof onClose === 'function' && onClose()} // Proteção typeof
              className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
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
  const [linkOriginal, setLinkOriginal] = useState('');
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
  
  // Estado para alerta de sucesso
  const [successAlert, setSuccessAlert] = useState(null);

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

        // Adicionar verificação se response.data existe
        if (!response.data) {
          throw new Error("Resposta da API de status de conexão está vazia.");
        }

        const { status, adAccounts, pages } = response.data; // Usar 'pages' como no backend
        console.log("Resposta de /api/meta/connection-status:", response.data);

        // Usar 'status' diretamente
        const connected = status === 'connected';
        setIsMetaConnected(connected);

        if (connected) {
          if (Array.isArray(adAccounts) && adAccounts.length > 0) {
            setAdAccountsList(adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
            // Selecionar o primeiro se nenhum estiver selecionado ou o selecionado não existir mais
            if (!selectedAdAccount || !adAccounts.some(acc => acc.id === selectedAdAccount)) {
              setSelectedAdAccount(adAccounts[0].id);
            }
          } else {
            setAdAccountsList([]);
            setSelectedAdAccount('');
            console.warn("Nenhuma conta de anúncios encontrada via API.");
          }

          // Usar 'pages' como no backend
          if (Array.isArray(pages) && pages.length > 0) {
            setPagesList(pages.map(page => ({ value: page.id, label: `${page.name} (${page.id})` })));
            // Selecionar a primeira se nenhuma estiver selecionada ou a selecionada não existir mais
            if (!selectedPage || !pages.some(page => page.id === selectedPage)) {
              setSelectedPage(pages[0].id);
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
  // Remover dependências desnecessárias se fetchMetaStatus não for recriado
  }, [selectedAdAccount, selectedPage]); // Adicionar selectedAdAccount e selectedPage como dependências para re-selecionar se necessário

  // Buscar campanhas quando a conta de anúncios for selecionada
  useEffect(() => {
    // Função interna para evitar recriação a cada render
    const buscarCampanhasInterno = async () => {
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
        
        // Verificar se campaigns existe e é um array
        if (response.data && Array.isArray(response.data.campaigns)) {
          setCampanhas(response.data.campaigns);
        } else {
          console.warn("Resposta de campanhas inválida ou vazia:", response.data);
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

    buscarCampanhasInterno();

  }, [selectedAdAccount, isMetaConnected]);

  // Inicializar o mapa
  useEffect(() => {
    let mapInstance = null;
    let circleInstance = null;

    const initMap = (lat, lng) => {
      const mapContainer = document.getElementById('map-container');
      // Verificar se Leaflet (L) está carregado e se o mapa ainda não foi inicializado
      if (mapContainer && window.L && !map) {
        try {
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
        } catch (mapError) {
          console.error("Erro ao inicializar o mapa Leaflet:", mapError);
          setMapLoaded(false); // Indicar que o mapa falhou ao carregar
        }
      }
    };

    // Carregar Leaflet se não estiver presente
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => {
        // Tentar inicializar o mapa DEPOIS que o script carregar
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => initMap(position.coords.latitude, position.coords.longitude),
            () => initMap(-23.5505, -46.6333) // Fallback SP
          );
        } else {
          initMap(-23.5505, -46.6333); // Fallback SP
        }
      };
      script.onerror = () => console.error("Falha ao carregar o script do Leaflet.");
      document.head.appendChild(script);

      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);
    } else {
      // Se Leaflet já existe, inicializar o mapa diretamente
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => initMap(position.coords.latitude, position.coords.longitude),
          () => initMap(-23.5505, -46.6333) // Fallback SP
        );
      } else {
        initMap(-23.5505, -46.6333); // Fallback SP
      }
    }

    // Cleanup function
    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (removeError) {
          console.warn("Erro ao remover instância do mapa:", removeError);
        }
        setMap(null); // Limpar estado do mapa
      }
    };
  // Dependência vazia para rodar apenas uma vez no mount
  }, []); 

  // Função para formatar data e hora
  const formatarDataHora = (data = new Date()) => {
    try {
      if (!data) return 'Data não disponível';
      
      // Se for string, converter para objeto Date
      if (typeof data === 'string') {
        data = new Date(data);
      }
      
      // Verificar se a data é válida
      if (isNaN(data.getTime())) return 'Data não disponível';
      
      // Formatar como dd/mm/aaaa hh:mm
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Erro ao formatar data e hora:', e);
      return 'Data não disponível';
    }
  };

  /**
   * Função para extrair page_id e post_id de diferentes formatos de links do Facebook
   * @param {string} link - Link da publicação do Facebook
   * @returns {object} - Objeto com page_id, post_id, linkProcessado e mensagem
   */
  const extrairIdsDoLink = (link) => {
    if (!link) return { 
      valido: false, 
      mensagem: "Link da publicação é obrigatório", 
      pageId: null, 
      postId: null, 
      linkProcessado: "" 
    };
    
    try {
      const url = new URL(link);
      
      // Verificar se é um link do Facebook
      if (!url.hostname.includes('facebook.com')) {
        return {
          valido: false,
          mensagem: "O link deve ser do Facebook (facebook.com)",
          pageId: null,
          postId: null,
          linkProcessado: ""
        };
      }
      
      // Formato 1: facebook.com/{page_id}/posts/{post_id}
      const regexPostsFormat = /facebook\.com\/(\d+)\/posts\/(\d+)/;
      const matchPosts = link.match(regexPostsFormat);
      
      if (matchPosts) {
        const pageId = matchPosts[1];
        const postId = matchPosts[2];
        return {
          valido: true,
          mensagem: "",
          pageId,
          postId,
          linkProcessado: `https://www.facebook.com/${pageId}/posts/${postId}`
        };
      }
      
      // Formato 2: permalink.php?story_fbid={post_id}&id={page_id}
      if (url.pathname.includes('/permalink.php')) {
        const storyFbid = url.searchParams.get('story_fbid');
        const pageId = url.searchParams.get('id');
        
        // Verificar se temos tanto story_fbid quanto id
        if (storyFbid && pageId) {
          // Tratar especificamente o caso de story_fbid começando com "pfbid"
          if (storyFbid.startsWith('pfbid')) {
            console.log("Detectado link com pfbid:", storyFbid);
            
            return {
              valido: true,
              mensagem: "Link com pfbid convertido para o formato padrão",
              pageId,
              postId: storyFbid, // Usar o pfbid completo como postId
              linkProcessado: `https://www.facebook.com/${pageId}/posts/${storyFbid}`
            };
          }
          
          // Caso normal (não pfbid)
          return {
            valido: true,
            mensagem: "Link convertido para o formato padrão",
            pageId,
            postId: storyFbid,
            linkProcessado: `https://www.facebook.com/${pageId}/posts/${storyFbid}`
          };
        }
      }
      
      // Formato 3: photo.php?fbid={post_id}&set=a.{album_id}&id={page_id}
      if (url.pathname.includes('/photo.php') || url.pathname.includes('/photo')) {
        const fbid = url.searchParams.get('fbid');
        let pageId = url.searchParams.get('id');
        
        // Se não tiver id explícito, tentar extrair de outros parâmetros
        if (!pageId) {
          // Tentar extrair do set
          const set = url.searchParams.get('set');
          if (set) {
            const setMatch = set.match(/a\.(\d+)/);
            if (setMatch) {
              pageId = setMatch[1];
            }
          }
        }
        
        if (fbid && pageId) {
          return {
            valido: true,
            mensagem: "Link de foto convertido para o formato padrão",
            pageId,
            postId: fbid,
            linkProcessado: `https://www.facebook.com/${pageId}/posts/${fbid}`
          };
        }
      }
      
      // Formato 4: share/p/{hash}
      if (url.pathname.includes('/share/p/')) {
        // Para links de compartilhamento, precisamos do ID da página selecionada
        if (selectedPage) {
          const pathParts = url.pathname.split('/');
          const hash = pathParts[pathParts.length - 1];
          
          return {
            valido: true,
            mensagem: "Link de compartilhamento convertido usando a página selecionada",
            pageId: selectedPage,
            postId: hash,
            linkProcessado: `https://www.facebook.com/${selectedPage}/posts/${hash}`
          };
        } else {
          return {
            valido: false,
            mensagem: "Não foi possível usar o link de compartilhamento. Selecione uma página primeiro.",
            pageId: null,
            postId: null,
            linkProcessado: ""
          };
        }
      }
      
      // Formato 5: pfbid0{hash} em qualquer parte do URL
      const pfbidMatch = link.match(/pfbid0([a-zA-Z0-9]+)/);
      if (pfbidMatch) {
        if (selectedPage) {
          const postId = "pfbid0" + pfbidMatch[1]; // Reconstruir o pfbid completo
          
          return {
            valido: true,
            mensagem: "Link com pfbid convertido usando a página selecionada",
            pageId: selectedPage,
            postId: postId,
            linkProcessado: `https://www.facebook.com/${selectedPage}/posts/${postId}`
          };
        } else {
          return {
            valido: false,
            mensagem: "Não foi possível extrair o ID da página. Selecione uma página primeiro.",
            pageId: null,
            postId: null,
            linkProcessado: ""
          };
        }
      }
      
      // Formato 6: facebook.com/{username}/posts/{post_id} (username não numérico)
      const usernamePostsMatch = link.match(/facebook\.com\/([^\/]+)\/posts\/(\d+)/);
      if (usernamePostsMatch && !/^\d+$/.test(usernamePostsMatch[1])) {
        // Se temos um username em vez de page_id, usar o ID da página selecionada
        const postId = usernamePostsMatch[2];
        
        if (selectedPage) {
          return {
            valido: true,
            mensagem: "Link com nome de usuário convertido usando a página selecionada",
            pageId: selectedPage,
            postId: postId,
            linkProcessado: `https://www.facebook.com/${selectedPage}/posts/${postId}`
          };
        } else {
          return {
            valido: false,
            mensagem: "Não foi possível usar o link com nome de usuário. Selecione uma página primeiro.",
            pageId: null,
            postId: null,
            linkProcessado: ""
          };
        }
      }
      
      // Se chegamos aqui, não conseguimos extrair os IDs
      return {
        valido: false,
        mensagem: "Não foi possível extrair os IDs da publicação deste link. Tente usar o link direto da publicação.",
        pageId: null,
        postId: null,
        linkProcessado: ""
      };
    } catch (error) {
      console.error("Erro ao processar link:", error);
      return {
        valido: false,
        mensagem: "URL inválida. Verifique se o link está completo e correto.",
        pageId: null,
        postId: null,
        linkProcessado: ""
      };
    }
  };

  // Handler para mudança no link da publicação
  const handleLinkPublicacaoChange = (e) => {
    const link = e.target.value;
    setLinkPublicacao(link);
    setLinkOriginal(link);
    
    if (link) {
      const resultado = extrairIdsDoLink(link);
      
      if (resultado.valido) {
        setLinkPublicacaoError("");
        setLinkPublicacaoProcessado(resultado.linkProcessado);
        
        // Se o link foi convertido, mostrar mensagem informativa
        if (link !== resultado.linkProcessado) {
          // Verificar se toast é uma função antes de chamar
          if (typeof toast === 'function') {
            toast({ 
              title: "Link convertido", 
              description: `O link foi convertido para o formato padrão: ${resultado.linkProcessado}`,
            });
          }
        }
      } else {
        setLinkPublicacaoError(resultado.mensagem);
        setLinkPublicacaoProcessado("");
      }
    } else {
      setLinkPublicacaoError("");
      setLinkPublicacaoProcessado("");
    }
  };

  // Função para abrir o anúncio no Ads Manager
  const handleVerAds = (campanha) => {
    // Adicionar verificação se campanha e campaignId existem
    if (!campanha || !campanha.campaignId) {
      console.error("Dados da campanha inválidos para abrir no Ads Manager:", campanha);
      if (typeof toast === 'function') {
        toast({ title: "Erro", description: "Não foi possível obter o ID da campanha para abrir no Ads Manager.", variant: "destructive" });
      }
      return;
    }
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
    setLinkOriginal('');
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
      if (typeof toast === 'function') toast({ title: "Erro", description: "Conecte sua conta Meta Ads para criar anúncios.", variant: "destructive" });
      return;
    }

    if (!selectedAdAccount) {
      setError('Selecione uma Conta de Anúncios.');
      if (typeof toast === 'function') toast({ title: "Erro", description: "Selecione uma Conta de Anúncios.", variant: "destructive" });
      return;
    }
    if (!selectedPage) {
      setError('Selecione uma Página do Facebook.');
       if (typeof toast === 'function') toast({ title: "Erro", description: "Selecione uma Página do Facebook.", variant: "destructive" });
      return;
    }
    if (!nomeCampanha || !orcamento || !linkPublicacao || !callToAction) {
      setError('Preencha todos os campos obrigatórios (*).');
      if (typeof toast === 'function') toast({ title: "Erro", description: "Preencha todos os campos obrigatórios (*).", variant: "destructive" });
      return;
    }
    
    // Processar o link da publicação
    const resultadoLink = extrairIdsDoLink(linkPublicacao);
    if (!resultadoLink.valido) {
      setError(resultadoLink.mensagem);
      setLinkPublicacaoError(resultadoLink.mensagem);
      if (typeof toast === 'function') toast({ title: "Erro", description: resultadoLink.mensagem, variant: "destructive" });
      return;
    }
    
    if (dataTermino && new Date(dataTermino) <= new Date(dataInicio)) {
      setError('A data de término deve ser posterior à data de início.');
      if (typeof toast === 'function') toast({ title: "Erro", description: "A data de término deve ser posterior à data de início.", variant: "destructive" });
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
      const linkFinal = resultadoLink.linkProcessado || linkPublicacao;

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
      
      // Adicionar a campanha à lista local com data de criação
      if (response.data.adDetails) {
        // Usar a data de criação retornada pelo backend
        const campanhaCriada = {
          ...response.data.adDetails
        };
        
        setCampanhas(prev => [campanhaCriada, ...prev]);
        
        // Criar URL para o Ads Manager
        const adsManagerUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedAdAccount}&selected_campaign_ids=${campanhaCriada.campaignId}`;
        
        // Obter a data de criação do backend ou usar a data atual como fallback
        const dataCriacao = campanhaCriada.createdAt || new Date();
        
        // Exibir alerta de sucesso com data/hora real de criação e link para o Ads Manager
        setSuccessAlert({
          message: `Anúncio criado com sucesso em ${formatarDataHora(dataCriacao)}`,
          adsUrl: adsManagerUrl
        });
        
        // Também exibir toast para feedback imediato
        if (typeof toast === 'function') {
          toast({ 
            title: "Sucesso!", 
            description: `Anúncio criado com sucesso em ${formatarDataHora(dataCriacao)}`, 
          });
        }
      }
      
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
      
      // Verificar se é um erro de post_id inválido
      if (error.response?.data?.error?.message?.includes("Invalid post_id parameter")) {
        errorMsg = "ID da publicação inválido. Certifique-se de que a publicação existe e está pública.";
      }
      
      setError(errorMsg);
      if (typeof toast === 'function') toast({ title: "Erro ao criar campanha", description: errorMsg, variant: "destructive" });
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
      {/* Alerta de sucesso */}
      {successAlert && (
        <SuccessAlert 
          message={successAlert.message} 
          adsUrl={successAlert.adsUrl} 
          onClose={() => setSuccessAlert(null)} // Chamada já protegida dentro do componente
        />
      )}
      
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
                  onChange={(e) => setSelectedAdAccount(e.target.value)} // Chamada já protegida dentro do componente
                  options={adAccountsList}
                  placeholder={metaLoading ? "Carregando..." : "Selecione a Conta"}
                  required
                  disabled={metaLoading || !isMetaConnected || !adAccountsList || adAccountsList.length === 0}
                />
                <SelectInput
                  id="facebookPage"
                  label="Página do Facebook"
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)} // Chamada já protegida dentro do componente
                  options={pagesList}
                  placeholder={metaLoading ? "Carregando..." : "Selecione a Página"}
                  required
                  disabled={metaLoading || !isMetaConnected || !pagesList || pagesList.length === 0}
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
                  onChange={(e) => setOrcamento(parseFloat(e.target.value) || 0)} // Garantir que seja número
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
                  placeholder="https://www.facebook.com/61576205176576/posts/122108356796873505"
                  required
                  disabled={!isMetaConnected}
                />
                {linkPublicacaoError && (
                  <p className="text-xs text-red-500 mt-1">{linkPublicacaoError}</p>
                )}
                {linkPublicacaoProcessado && !linkPublicacaoError && (
                  <p className="text-xs text-green-500 mt-1">
                    Link válido! {linkOriginal !== linkPublicacaoProcessado && `(Convertido para: ${linkPublicacaoProcessado})`}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  A publicação deve estar pública. Você pode colar links em qualquer formato:
                  <br />- facebook.com/página/posts/id
                  <br />- permalink.php?story_fbid=...&id=...
                  <br />- photo?fbid=...
                </p>
              </div>
              
              <SelectInput
                id="callToAction"
                label="Botão de Ação *"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)} // Chamada já protegida dentro do componente
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
            onClick={buscarCampanhas} // Assumindo que buscarCampanhas é sempre uma função definida no escopo
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
        ) : Array.isArray(campanhas) && campanhas.length > 0 ? (
          <div className="space-y-2">
            {campanhas.map((campanha, index) => (
              <CampanhaItem 
                key={campanha?.id || index} // Adicionar verificação para campanha?.id
                campanha={campanha} 
                onVerAds={handleVerAds} // Chamada já protegida dentro do componente
              />
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

