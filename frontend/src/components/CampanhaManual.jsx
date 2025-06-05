
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useToast } from "../hooks/use-toast";
import { useMetaAds } from '../contexts/MetaAdsContext'; // <<< IMPORTED CONTEXT HOOK
import api from '../lib/api'; // <<< IMPORTED API LIB FOR CONSISTENCY

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
          <h3 className="font-medium text-lg">{campanha.name}</h3>
          <div className="text-sm text-gray-500 mt-1">
            Criada em: {formatarData(campanha.startDate || campanha.created_time)}
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
          onClick={() => onVerAds(campanha)} // Corrected: Pass campanha to onVerAds
          className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          Ver no Ads
        </button>
      </div>
    </div>
  );
};

// Componente de alerta de sucesso
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
              onClick={onClose}
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
  const { metaStatus, loading: metaLoadingContext, error: metaErrorContext, checkConnectionStatus } = useMetaAds(); // <<< USE CONTEXT

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

  // Estados Meta (derived from context now)
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');

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
  const [loading, setLoading] = useState(false); // Loading for form submission, keep separate
  const [error, setError] = useState(null); // Error for form submission, keep separate

  // Estado para alerta de sucesso
  const [successAlert, setSuccessAlert] = useState(null);

  // Use derived state from context
  const isMetaConnected = metaStatus.status === 'connected';

  // Definir data de início padrão
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  // Update Ad Accounts and Pages list based on context
  useEffect(() => {
    if (isMetaConnected) {
      const accounts = metaStatus.adAccounts || [];
      const pages = metaStatus.pages || [];

      if (accounts.length > 0) {
        setAdAccountsList(accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
        // Auto-select first account if none selected or previous selection is invalid
        if (!selectedAdAccount || !accounts.some(acc => acc.id === selectedAdAccount)) {
          setSelectedAdAccount(accounts[0].id);
        }
      } else {
        setAdAccountsList([]);
        setSelectedAdAccount('');
        console.warn("Nenhuma conta de anúncios encontrada via Contexto Meta.");
      }

      if (pages.length > 0) {
        setPagesList(pages.map(page => ({ value: page.id, label: `${page.name} (${page.id})` })));
         // Auto-select first page if none selected or previous selection is invalid
        if (!selectedPage || !pages.some(page => page.id === selectedPage)) {
          setSelectedPage(pages[0].id);
        }
      } else {
        setPagesList([]);
        setSelectedPage('');
        console.warn("Nenhuma página do Facebook encontrada via Contexto Meta.");
      }
    } else {
      // Reset lists if not connected
      setAdAccountsList([]);
      setPagesList([]);
      setSelectedAdAccount('');
      setSelectedPage('');
    }
    // Depend on connection status and data from context. Use JSON.stringify for array/object dependencies.
  }, [isMetaConnected, JSON.stringify(metaStatus.adAccounts), JSON.stringify(metaStatus.pages)]);


  // Função para buscar campanhas (memoized)
  const buscarCampanhas = useCallback(async () => {
    // <<< CORREÇÃO: Remover prefixo 'act_' do ID da conta >>>
    const adAccountIdWithoutPrefix = selectedAdAccount.startsWith('act_')
      ? selectedAdAccount.substring(4)
      : selectedAdAccount;

    if (!adAccountIdWithoutPrefix || !isMetaConnected) {
      setCampanhas([]); // Clear campaigns if not connected or no account selected
      return;
    }

    setCarregandoCampanhas(true);
    setErroCampanhas(null);

    try {
      console.log(`[Frontend] Buscando campanhas para Ad Account ID: ${adAccountIdWithoutPrefix}`); // Log ID being sent
      // Use the api instance from lib for consistency
      const response = await api.get(`/meta-ads/campaigns`, {
        params: { adAccountId: adAccountIdWithoutPrefix } // <<< Enviar ID sem prefixo
      });

      if (response.data && response.data.campaigns) {
        setCampanhas(response.data.campaigns);
      } else {
        setCampanhas([]);
      }
    } catch (error) {
      console.error('[Frontend] Erro ao buscar campanhas:', error.response?.data || error.message);
      const apiErrorMessage = error.response?.data?.message || 'Erro desconhecido da API.';
      setErroCampanhas(`Não foi possível carregar as campanhas: ${apiErrorMessage}`);
      setCampanhas([]);
    } finally {
      setCarregandoCampanhas(false);
    }
  }, [selectedAdAccount, isMetaConnected]); // Depend on selected account and connection status

  // Buscar campanhas quando a conta de anúncios for selecionada ou conexão mudar
  useEffect(() => {
    buscarCampanhas();
  }, [buscarCampanhas]); // Depend on the memoized function


  // Inicializar o mapa
  useEffect(() => {
    let mapInstance = null;
    let circleInstance = null;

    const initMap = (lat, lng) => {
      const mapContainer = document.getElementById('map-container');
      // <<< CORREÇÃO: Verificar se o mapa já foi inicializado antes de criar um novo >>>
      if (mapContainer && window.L && !mapInstance && !document.querySelector('#map-container .leaflet-pane')) {
        try {
          console.log('[Map Init] Inicializando mapa Leaflet...');
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
          console.log('[Map Init] Mapa Leaflet inicializado com sucesso.');
        } catch (mapError) {
           console.error('[Map Init] Erro ao inicializar mapa Leaflet:', mapError);
           // Handle error, maybe show a message to the user
        }
      } else if (document.querySelector('#map-container .leaflet-pane')) {
         console.warn('[Map Init] Tentativa de reinicializar mapa já existente. Ignorando.');
      } else if (!window.L) {
         console.warn('[Map Init] Leaflet não carregado ainda.');
      }
    };

    // Load Leaflet if not already loaded
    const loadLeafletAndInitMap = () => {
       if (!window.L) {
         console.log('[Map Init] Carregando script e CSS do Leaflet...');
         const script = document.createElement('script');
         script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
         script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
         script.crossOrigin = '';
         script.async = true;
         document.head.appendChild(script);

         const linkElement = document.createElement('link');
         linkElement.rel = 'stylesheet';
         linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
         document.head.appendChild(linkElement);

         // Retry map initialization after Leaflet loads
         script.onload = () => {
           console.log('[Map Init] Leaflet carregado. Tentando inicializar mapa...');
           navigator.geolocation.getCurrentPosition(
             (position) => initMap(position.coords.latitude, position.coords.longitude),
             () => initMap(-23.5505, -46.6333) // Fallback location
           );
         };
         script.onerror = () => console.error('[Map Init] Falha ao carregar script do Leaflet.');
       } else {
           // If Leaflet is already loaded, initialize immediately
           console.log('[Map Init] Leaflet já carregado. Inicializando mapa...');
           navigator.geolocation.getCurrentPosition(
             (position) => initMap(position.coords.latitude, position.coords.longitude),
             () => initMap(-23.5505, -46.6333) // Fallback location
           );
       }
    };

    loadLeafletAndInitMap();

    // Cleanup function
    return () => {
      if (mapInstance) {
        console.log('[Map Cleanup] Removendo instância do mapa Leaflet.');
        mapInstance.remove();
        setMap(null); // Clear map state on unmount
        setMapLoaded(false);
      }
    };
  }, []); // Run only once on mount

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

      // Formato 1: facebook.com/{page_name_or_id}/posts/{post_id}
      // Updated regex to handle page names or IDs
      const regexPostsFormat = /facebook\.com\/([^/]+)\/posts\/(\d+)/;
      const matchPosts = link.match(regexPostsFormat);

      if (matchPosts) {
        const pageIdentifier = matchPosts[1]; // Could be name or ID
        const postIdNum = matchPosts[2];
        // We need the page ID, not necessarily the identifier in the URL.
        // We'll rely on the selectedPage state which holds the ID.
        if (!selectedPage) {
           return { valido: false, mensagem: "Selecione a página do Facebook correspondente.", pageId: null, postId: null, linkProcessado: "" };
        }
        return {
          valido: true,
          mensagem: "",
          pageId: selectedPage, // Use the selected page ID
          postId: `${selectedPage}_${postIdNum}`, // Construct the full post ID
          linkProcessado: `https://www.facebook.com/${selectedPage}/posts/${postIdNum}`
        };
      }

      // Formato 2: facebook.com/permalink.php?story_fbid={post_id}&id={page_id}
      if (url.pathname.includes('/permalink.php')) {
        const storyFbid = url.searchParams.get('story_fbid');
        const pageId = url.searchParams.get('id');

        if (storyFbid && pageId) {
          // Handle potential "pfbid" format - the actual numeric ID might be part of it or need extraction
          // For simplicity, assume story_fbid is the numeric part for now, or the backend handles pfbid.
          // The full post_id is usually pageId_storyFbid
          const postId = storyFbid.startsWith('pfbid') ? storyFbid : `${pageId}_${storyFbid}`; // Use the story_fbid directly if it starts with pfbid, otherwise construct
          return {
            valido: true,
            mensagem: "",
            pageId,
            postId: postId, // Use the constructed or original story_fbid
            linkProcessado: `https://www.facebook.com/permalink.php?story_fbid=${storyFbid}&id=${pageId}`
          };
        }
      }

      // Formato 3: facebook.com/photo.php?fbid={post_id}&set=a...&id={page_id}
      // Formato 4: facebook.com/photo/?fbid={post_id}&set=a...&id={page_id}
      if (url.pathname.includes('/photo.php') || url.pathname.includes('/photo/')) {
        const fbid = url.searchParams.get('fbid');
        const pageIdFromUrl = url.searchParams.get('id'); // May not always be present
        const setId = url.searchParams.get('set'); // May indicate album photo

        if (fbid) {
           const finalPageId = pageIdFromUrl || selectedPage; // Use URL id or selected page
           if (!finalPageId) {
              return { valido: false, mensagem: "Não foi possível determinar o ID da página. Selecione a página correta.", pageId: null, postId: null, linkProcessado: "" };
           }
           const postId = `${finalPageId}_${fbid}`;
           return {
             valido: true,
             mensagem: "",
             pageId: finalPageId,
             postId: postId,
             linkProcessado: `https://www.facebook.com/${finalPageId}/posts/${fbid}` // Construct a standard-like link
           };
        }
      }

      // Formato 5: facebook.com/watch/?v={video_id}
      if (url.pathname.includes('/watch/')) {
          const videoId = url.searchParams.get('v');
          if (videoId) {
              if (!selectedPage) {
                 return { valido: false, mensagem: "Selecione a página do Facebook correspondente ao vídeo.", pageId: null, postId: null, linkProcessado: "" };
              }
              const postId = `${selectedPage}_${videoId}`;
              return {
                  valido: true,
                  mensagem: "",
                  pageId: selectedPage,
                  postId: postId,
                  linkProcessado: `https://www.facebook.com/watch/?v=${videoId}`
              };
          }
      }

      // Formato 6: facebook.com/reel/{reel_id}
      const reelMatch = link.match(/facebook\.com\/reel\/(\d+)/);
      if (reelMatch) {
          const reelId = reelMatch[1];
          if (!selectedPage) {
             return { valido: false, mensagem: "Selecione a página do Facebook correspondente ao Reel.", pageId: null, postId: null, linkProcessado: "" };
          }
          const postId = `${selectedPage}_${reelId}`; // Assuming reel ID can be used like post ID
          return {
              valido: true,
              mensagem: "",
              pageId: selectedPage,
              postId: postId,
              linkProcessado: `https://www.facebook.com/reel/${reelId}`
          };
      }

      // Se nenhum formato conhecido for encontrado
      return {
        valido: false,
        mensagem: "Formato de link não reconhecido ou inválido. Use o link permanente da publicação.",
        pageId: null,
        postId: null,
        linkProcessado: ""
      };

    } catch (error) {
      console.error('Erro ao processar link:', error);
      return {
        valido: false,
        mensagem: "Erro ao processar o link. Verifique se está correto.",
        pageId: null,
        postId: null,
        linkProcessado: ""
      };
    }
  };

  // Função para lidar com a mudança no link da publicação
  const handleLinkChange = (e) => {
    const newLink = e.target.value;
    setLinkPublicacao(newLink);
    setLinkOriginal(newLink); // Store original link

    if (newLink.trim() === '') {
      setLinkPublicacaoError('');
      setLinkPublicacaoProcessado('');
      return;
    }

    const linkInfo = extrairIdsDoLink(newLink);

    if (linkInfo.valido) {
      setLinkPublicacaoError('');
      setLinkPublicacaoProcessado(linkInfo.linkProcessado);
      // Optionally auto-select page if ID matches
      if (linkInfo.pageId && pagesList.some(p => p.value === linkInfo.pageId)) {
          // setSelectedPage(linkInfo.pageId); // Be careful with auto-selection, might confuse user
      }
    } else {
      setLinkPublicacaoError(linkInfo.mensagem);
      setLinkPublicacaoProcessado('');
    }
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous form errors
    setSuccessAlert(null); // Clear previous success alert

    if (!isMetaConnected) {
      setError("Por favor, conecte sua conta Meta Ads primeiro.");
      toast({ title: "Erro", description: "Conecte sua conta Meta Ads para criar campanhas.", variant: "destructive" });
      return;
    }

    const adAccountIdWithoutPrefix = selectedAdAccount.startsWith('act_')
      ? selectedAdAccount.substring(4)
      : selectedAdAccount;

    if (!adAccountIdWithoutPrefix || !selectedPage) {
      setError("Selecione uma conta de anúncios e uma página do Facebook.");
      toast({ title: "Erro", description: "Conta de anúncios ou página não selecionada.", variant: "destructive" });
      return;
    }

    const linkInfo = extrairIdsDoLink(linkPublicacao);
    if (!linkInfo.valido || !linkInfo.postId) { // Ensure postId is extracted
      setLinkPublicacaoError(linkInfo.mensagem || "Link da publicação inválido ou ID do post não encontrado.");
      toast({ title: "Erro", description: linkInfo.mensagem || "Link da publicação inválido ou ID do post não encontrado.", variant: "destructive" });
      return;
    }
    setLinkPublicacaoError(''); // Clear link error if valid

    setLoading(true); // Start form submission loading

    const campanhaData = {
      name: nomeCampanha,
      objective: 'OUTCOME_LEADS', // Ou outro objetivo relevante
      status: 'PAUSED', // Começar pausada por segurança
      special_ad_categories: [],
      adAccountId: adAccountIdWithoutPrefix, // <<< Enviar ID sem prefixo
      pageId: selectedPage,
      postId: linkInfo.postId, // Use the extracted post ID (pageId_postId)
      daily_budget: (orcamento / 7).toFixed(2),
      call_to_action_type: callToAction,
      targeting: {
        geo_locations: {
          custom_locations: [
            {
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              radius: 10,
              distance_unit: 'kilometer'
            }
          ]
        },
      }
    };

    // Adicionar datas se fornecidas
    if (dataInicio) campanhaData.start_time = new Date(dataInicio).toISOString();
    if (dataTermino) campanhaData.end_time = new Date(dataTermino).toISOString();

    console.log("[Frontend] Enviando dados para criar campanha:", campanhaData);

    try {
      // Use the api instance from lib
      const response = await api.post('/meta-ads/create-campaign', campanhaData);

      console.log("[Frontend] Resposta da criação da campanha:", response.data);

      if (response.data.success && response.data.campaignId) {
        const adsManagerLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountIdWithoutPrefix}&campaign_id=${response.data.campaignId}`;
        setSuccessAlert({
          message: `Campanha "${nomeCampanha}" criada com sucesso!`,
          adsUrl: adsManagerLink
        });
        toast({ title: "Sucesso!", description: `Campanha "${nomeCampanha}" criada.` });
        // Limpar formulário ou atualizar lista de campanhas
        setNomeCampanha('');
        setLinkPublicacao('');
        setLinkPublicacaoProcessado('');
        setLinkOriginal('');
        buscarCampanhas(); // Atualizar a lista após criar
      } else {
        throw new Error(response.data.message || 'Falha ao criar campanha.');
      }
    } catch (err) {
      console.error('[Frontend] Erro ao criar campanha manual:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.message || 'Ocorreu um erro desconhecido ao criar a campanha.';
      setError(`Erro ao criar campanha: ${errorMessage}`);
      toast({ title: "Erro ao Criar Campanha", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false); // End form submission loading
    }
  };

  // Função para abrir o Ads Manager
  const handleVerAds = (campanha) => {
    if (!campanha || !campanha.id || !selectedAdAccount) return;
    const adAccountIdWithoutPrefix = selectedAdAccount.startsWith('act_')
      ? selectedAdAccount.substring(4)
      : selectedAdAccount;
    const adsManagerLink = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountIdWithoutPrefix}&campaign_id=${campanha.id}`;
    window.open(adsManagerLink, '_blank', 'noopener,noreferrer');
  };

  // Renderização do componente
  return (
    <div className="space-y-8">
      {/* Alerta de Sucesso */}
      {successAlert && (
        <SuccessAlert
          message={successAlert.message}
          adsUrl={successAlert.adsUrl}
          onClose={() => setSuccessAlert(null)}
        />
      )}

      {/* Alerta de Conexão Meta (usando contexto) */}
      {!isMetaConnected && !metaLoadingContext && (
        <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow">
          <h3 className="font-medium">Conexão Meta Ads Necessária</h3>
          <p className="text-sm mt-1">
            Para criar ou visualizar campanhas, você precisa conectar sua conta Meta Ads.
            Verifique o componente de conexão acima ou na seção de perfil.
          </p>
        </div>
      )}

      {/* Exibir erro do contexto, se houver */}
       {metaErrorContext && (
         <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow">
           <h3 className="font-medium">Erro na Conexão Meta</h3>
           <p className="text-sm mt-1">{metaErrorContext}</p>
           <button onClick={checkConnectionStatus} className="mt-2 text-sm font-medium text-red-800 hover:underline">Tentar Novamente</button>
         </div>
       )}

      {/* Formulário de Criação */}
      <form onSubmit={handleSubmit} className="p-6 bg-white border rounded-lg shadow-sm space-y-6">
        <h2 className="text-xl font-semibold border-b pb-3 mb-6">Criar Nova Campanha Manual</h2>

        {/* Exibir erro do formulário */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seleção de Conta e Página */}
          <SelectInput
            id="adAccount"
            label="Conta de Anúncios Meta"
            value={selectedAdAccount} // Value still uses the ID with prefix (e.g., act_123)
            onChange={(e) => setSelectedAdAccount(e.target.value)}
            options={adAccountsList}
            placeholder={metaLoadingContext ? "Carregando contas..." : "Selecione uma conta"}
            required
            disabled={!isMetaConnected || metaLoadingContext || adAccountsList.length === 0}
          />
          <SelectInput
            id="page"
            label="Página do Facebook"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            options={pagesList}
            placeholder={metaLoadingContext ? "Carregando páginas..." : "Selecione uma página"}
            required
            disabled={!isMetaConnected || metaLoadingContext || pagesList.length === 0}
          />

          {/* Nome da Campanha */}
          <div>
            <label htmlFor="nomeCampanha" className="block text-sm font-medium mb-1">Nome da Campanha *</label>
            <input
              id="nomeCampanha"
              type="text"
              value={nomeCampanha}
              onChange={(e) => setNomeCampanha(e.target.value)}
              className="w-full p-2 border rounded-md disabled:bg-gray-100"
              placeholder="Ex: Promoção Fim de Semana"
              required
              disabled={!isMetaConnected || metaLoadingContext}
            />
          </div>

          {/* Orçamento Semanal */}
          <div>
            <label htmlFor="orcamento" className="block text-sm font-medium mb-1">Orçamento Semanal (R$) *</label>
            <input
              id="orcamento"
              type="number"
              value={orcamento}
              onChange={(e) => setOrcamento(Number(e.target.value))}
              min="10" // Definir um mínimo razoável
              step="1"
              className="w-full p-2 border rounded-md disabled:bg-gray-100"
              required
              disabled={!isMetaConnected || metaLoadingContext}
            />
            <p className="text-xs text-gray-500 mt-1">Orçamento diário estimado: R$ {(orcamento / 7).toFixed(2)}</p>
          </div>

          {/* Link da Publicação */}
          <div className="md:col-span-2">
            <label htmlFor="linkPublicacao" className="block text-sm font-medium mb-1">Link da Publicação do Facebook *</label>
            <input
              id="linkPublicacao"
              type="url"
              value={linkPublicacao}
              onChange={handleLinkChange}
              className={`w-full p-2 border rounded-md ${linkPublicacaoError ? 'border-red-500' : ''} disabled:bg-gray-100`}
              placeholder="Cole o link completo da publicação aqui"
              required
              disabled={!isMetaConnected || metaLoadingContext}
            />
            {linkPublicacaoError && <p className="text-xs text-red-500 mt-1">{linkPublicacaoError}</p>}
            {linkPublicacaoProcessado && !linkPublicacaoError && (
              <p className="text-xs text-green-600 mt-1">Link válido: {linkPublicacaoProcessado}</p>
            )}
          </div>

          {/* Datas (Opcional) */}
          <div>
            <label htmlFor="dataInicio" className="block text-sm font-medium mb-1">Data de Início</label>
            <input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full p-2 border rounded-md disabled:bg-gray-100"
              min={new Date().toISOString().split('T')[0]} // Não permitir data passada
              disabled={!isMetaConnected || metaLoadingContext}
            />
          </div>
          <div>
            <label htmlFor="dataTermino" className="block text-sm font-medium mb-1">Data de Término (Opcional)</label>
            <input
              id="dataTermino"
              type="date"
              value={dataTermino}
              onChange={(e) => setDataTermino(e.target.value)}
              className="w-full p-2 border rounded-md disabled:bg-gray-100"
              min={dataInicio || new Date().toISOString().split('T')[0]} // Não permitir data anterior ao início
              disabled={!isMetaConnected || metaLoadingContext}
            />
          </div>

          {/* Call to Action */}
           <SelectInput
             id="callToAction"
             label="Botão de Chamada para Ação (CTA)"
             value={callToAction}
             onChange={(e) => setCallToAction(e.target.value)}
             options={[
               { value: 'LEARN_MORE', label: 'Saiba mais' },
               { value: 'SHOP_NOW', label: 'Comprar agora' },
               { value: 'BOOK_TRAVEL', label: 'Reservar agora' },
               { value: 'CONTACT_US', label: 'Fale conosco' },
               { value: 'GET_QUOTE', label: 'Obter cotação' },
               { value: 'ORDER_NOW', label: 'Pedir agora' },
               { value: 'SEND_MESSAGE', label: 'Enviar mensagem' },
               { value: 'WHATSAPP_MESSAGE', label: 'Enviar mensagem pelo WhatsApp' },
               // Adicionar mais CTAs conforme necessário
             ]}
             placeholder="Selecione um CTA"
             required
             disabled={!isMetaConnected || metaLoadingContext}
           />

          {/* Mapa de Localização */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Localização e Raio (Fixo: 10km)</label>
            <div id="map-container" style={{ height: '300px' }} className="border rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
              {!mapLoaded && <p className="text-gray-500">Carregando mapa...</p>}
            </div>
            {currentLocation && mapLoaded && (
              <p className="text-xs text-gray-600 mt-1">
                Centro do anúncio: Lat {currentLocation.lat.toFixed(4)}, Lng {currentLocation.lng.toFixed(4)}. Raio: 10km.
              </p>
            )}
          </div>
        </div>

        {/* Botão de Envio */}
        <div className="flex justify-end pt-4 border-t mt-6">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={loading || !isMetaConnected || metaLoadingContext}
          >
            {loading && (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
            )}
            {loading ? 'Criando Campanha...' : 'Criar Campanha'}
          </button>
        </div>
      </form>

      {/* Listagem de Campanhas Existentes */}
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold">Campanhas Criadas (Conta Selecionada)</h2>
          <button
            onClick={buscarCampanhas}
            disabled={carregandoCampanhas || !isMetaConnected || !selectedAdAccount}
            className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {carregandoCampanhas && (
               <span className="animate-spin h-4 w-4 border-2 border-gray-700 border-t-transparent rounded-full mr-2"></span>
            )}
            {carregandoCampanhas ? 'Atualizando...' : 'Atualizar Lista'}
          </button>
        </div>

        {metaLoadingContext && <p className="text-center text-gray-500 py-4">Carregando status da conexão...</p>}

        {!isMetaConnected && !metaLoadingContext && (
           <p className="text-center text-gray-500 py-4">Conecte sua conta Meta Ads para ver as campanhas.</p>
        )}

        {isMetaConnected && !selectedAdAccount && !metaLoadingContext && (
           <p className="text-center text-gray-500 py-4">Selecione uma conta de anúncios para ver as campanhas.</p>
        )}

        {isMetaConnected && selectedAdAccount && carregandoCampanhas && (
          <p className="text-center text-gray-500 py-4">Carregando campanhas...</p>
        )}

        {isMetaConnected && selectedAdAccount && erroCampanhas && !carregandoCampanhas && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm text-center">
            {erroCampanhas}
          </div>
        )}

        {isMetaConnected && selectedAdAccount && !carregandoCampanhas && !erroCampanhas && campanhas.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nenhuma campanha encontrada para esta conta.</p>
        )}

        {isMetaConnected && selectedAdAccount && !carregandoCampanhas && !erroCampanhas && campanhas.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {campanhas.map(campanha => (
              <CampanhaItem key={campanha.id} campanha={campanha} onVerAds={handleVerAds} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampanhaManual;

