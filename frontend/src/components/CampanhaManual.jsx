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
  const [imagem, setImagem] = useState(null);
  const [imagemPreview, setImagemPreview] = useState('');
  const [tipoAnuncio, setTipoAnuncio] = useState('imagem'); // Alterado para 'imagem' como padrão

  // Estados Meta
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isMetaConnected, setIsMetaConnected] = useState(false); // Estado para controlar a conexão
  const [metaLoading, setMetaLoading] = useState(true); // Estado para carregamento dos dados Meta

  const fileInputRef = useRef(null);

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

  // Lidar com a seleção de imagem
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Erro", description: "A imagem excede o limite de 5MB.", variant: "destructive" });
        return;
      }
      setImagem(file);
      setTipoAnuncio('imagem');
      const reader = new FileReader();
      reader.onloadend = () => setImagemPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Limpar a imagem selecionada
  const handleClearImage = () => {
    setImagem(null);
    setImagemPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    if (!nomeCampanha || !orcamento || !dataInicio || !descricaoAnuncio || !callToAction) {
      setError('Preencha todos os campos obrigatórios (*).');
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios (*).", variant: "destructive" });
      return;
    }
    if (tipoAnuncio === 'post' && !linkPublicacao) {
      setError('Forneça o link da publicação existente.');
      toast({ title: "Erro", description: "Forneça o link da publicação existente.", variant: "destructive" });
      return;
    }
    if (tipoAnuncio === 'imagem' && !imagem) {
      setError('Selecione uma imagem para o anúncio.');
      toast({ title: "Erro", description: "Selecione uma imagem para o anúncio.", variant: "destructive" });
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
      
      // Escolher o endpoint correto com base no tipo de anúncio
      let endpoint;
      let dataToSend;
      let headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      const commonData = {
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
        adDescription: descricaoAnuncio,
        callToAction: callToAction,
        menuUrl: linkCardapio || null,
        adTitle: tituloAnuncio || null
      };

      if (tipoAnuncio === 'imagem') {
        // Usar o novo endpoint para criar anúncio a partir de imagem
        endpoint = `${API_BASE_URL}/meta-ads/create-from-image`;
        headers['Content-Type'] = 'multipart/form-data';
        dataToSend = new FormData();
        
        // Adicionar todos os campos comuns ao FormData
        Object.keys(commonData).forEach(key => {
          if (key === 'location') {
            dataToSend.append('location[latitude]', commonData.location.latitude);
            dataToSend.append('location[longitude]', commonData.location.longitude);
            dataToSend.append('location[radius]', commonData.location.radius);
          } else if (commonData[key] !== null && commonData[key] !== undefined) {
            dataToSend.append(key, commonData[key]);
          }
        });
        
        // Adicionar a imagem ao FormData com o nome de campo 'image'
        dataToSend.append('image', imagem);
      } else {
        // Usar o endpoint para criar anúncio a partir de post existente
        endpoint = `${API_BASE_URL}/meta/create-ad-from-post`;
        headers['Content-Type'] = 'application/json';
        dataToSend = JSON.stringify({ 
          ...commonData, 
          postUrl: linkPublicacao 
        });
      }

      console.log('Enviando dados para:', endpoint);

      const response = await axios({
        method: 'post',
        url: endpoint,
        data: dataToSend,
        headers: headers
      });

      console.log('Resposta da API:', response.data);
      toast({ title: "Sucesso!", description: response.data.message || "Campanha criada com sucesso!" });

      // Limpar formulário
      setNomeCampanha('');
      setOrcamento(70);
      setLinkCardapio('');
      setLinkPublicacao('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setDataTermino('');
      setTituloAnuncio('');
      setDescricaoAnuncio('');
      setCallToAction('LEARN_MORE');
      handleClearImage();

      // Redirecionar para a tela de listagem de campanhas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campanhaCreated', { detail: response.data }));
        // Redirecionar para a listagem de campanhas após sucesso
        setTimeout(() => {
          window.location.href = '/dashboard/campanhas';
        }, 1500);
      }

    } catch (error) {
      console.error('Erro ao criar campanha:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message || 'Erro desconhecido ao criar campanha.';
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

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow">
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
            <div className="mt-4">
              <label htmlFor="raioAlcanceSlider" className="block mb-2 text-sm font-medium">
                Raio de Alcance ({raioAlcance} Km)
              </label>
              <input
                id="raioAlcanceSlider"
                type="range"
                min="1"
                max="50" // Ajustado para máximo de 50km conforme solicitado
                value={raioAlcance}
                onChange={(e) => setRaioAlcance(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!isMetaConnected}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
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
            </div>

            <div>
              <span className="block text-sm font-medium mb-1">Tipo de Anúncio *</span>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="imagem"
                    checked={tipoAnuncio === 'imagem'}
                    onChange={() => { setTipoAnuncio('imagem'); setLinkPublicacao(''); }}
                    className="mr-2"
                    disabled={!isMetaConnected}
                  />
                  Upload de Imagem
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="post"
                    checked={tipoAnuncio === 'post'}
                    onChange={() => { setTipoAnuncio('post'); handleClearImage(); }}
                    className="mr-2"
                    disabled={!isMetaConnected}
                  />
                  Publicação Existente
                </label>
              </div>
            </div>

            {tipoAnuncio === 'imagem' && (
              <div>
                <label htmlFor="imagem" className="block text-sm font-medium mb-1">Imagem para o Anúncio *</label>
                <input
                  type="file"
                  id="imagem"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/gif"
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                  disabled={!isMetaConnected}
                />
                {imagemPreview && (
                  <div className="mt-2 relative w-32 h-32 border rounded overflow-hidden">
                    <img src={imagemPreview} alt="Preview" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                      aria-label="Remover imagem"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {tipoAnuncio === 'post' && (
              <div>
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
            )}

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
              <label htmlFor="descricaoAnuncio" className="block text-sm font-medium mb-1">Descrição do Anúncio *</label>
              <textarea
                id="descricaoAnuncio"
                value={descricaoAnuncio}
                onChange={(e) => setDescricaoAnuncio(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows="3"
                placeholder="Ex: Venha experimentar nossos pratos especiais com 20% de desconto!"
                required
                disabled={!isMetaConnected}
              ></textarea>
            </div>
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
  );
};

export default CampanhaManual;
