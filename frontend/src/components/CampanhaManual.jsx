import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from "./ui/use-toast"; // Importar useToast

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
  const { toast } = useToast(); // Hook para exibir toasts

  // Estados para os campos do formulário
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
  const [tipoAnuncio, setTipoAnuncio] = useState('post'); // 'post' ou 'imagem'

  // Estados para seleção de Conta e Página
  const [adAccountsList, setAdAccountsList] = useState([]);
  const [pagesList, setPagesList] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');

  // Referência para o input de arquivo
  const fileInputRef = useRef(null);

  // Estados para o mapa
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [circle, setCircle] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: -23.5505, lng: -46.6333 }); // Padrão SP

  // Estados para controle de carregamento e erros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Definir data de início padrão como hoje
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  // Buscar informações do usuário e carregar contas/páginas
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsedInfo = JSON.parse(storedUserInfo);
        setUserInfo(parsedInfo);

        // Popular listas de Ad Accounts e Pages
        if (parsedInfo.adAccounts && parsedInfo.adAccounts.length > 0) {
          setAdAccountsList(parsedInfo.adAccounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.id})` })));
          // Selecionar a primeira conta por padrão, se houver apenas uma
          if (parsedInfo.adAccounts.length === 1) {
             setSelectedAdAccount(parsedInfo.adAccounts[0].id);
          }
        } else {
          console.warn("Nenhuma conta de anúncios encontrada para o usuário.");
        }

        if (parsedInfo.metaPages && parsedInfo.metaPages.length > 0) {
          setPagesList(parsedInfo.metaPages.map(page => ({ value: page.id, label: `${page.name} (${page.id})` })));
           // Selecionar a primeira página por padrão, se houver apenas uma
          if (parsedInfo.metaPages.length === 1) {
             setSelectedPage(parsedInfo.metaPages[0].id);
          }
        } else {
          console.warn("Nenhuma página do Facebook encontrada para o usuário.");
        }
      } else {
         console.error("Informações do usuário não encontradas no localStorage.");
         setError("Erro ao carregar dados do usuário. Faça login novamente.");
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
      setError("Erro ao processar dados do usuário.");
    }
  }, []);

  // Inicializar o mapa quando o componente montar
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

    // Tentar obter localização do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          initMap(latitude, longitude);
        },
        (error) => {
          console.warn("Erro ao obter geolocalização, usando padrão SP:", error);
          initMap(-23.5505, -46.6333); // Fallback para SP
        }
      );
    } else {
      console.warn("Geolocalização não suportada, usando padrão SP.");
      initMap(-23.5505, -46.6333); // Fallback para SP
    }

    // Carregar Leaflet se não estiver presente
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

    // Limpeza
    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []); // Executa apenas uma vez na montagem

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
      // Validar tamanho (ex: 5MB)
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

    // --- Validações do Formulário --- 
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
    if (!nomeCampanha || !orcamento || !dataInicio || !descricaoAnuncio || !callToAction || !linkCardapio) {
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
      const token = localStorage.getItem('token') || (userInfo && userInfo.token);
      if (!token) {
        throw new Error('Usuário não autenticado.');
      }

      // URL do novo endpoint
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      const endpoint = `${API_BASE_URL}/ads/create-recommended-traffic-campaign`;

      // Preparar dados (FormData para imagem, JSON para post)
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
        adType: tipoAnuncio,
        adTitle: tituloAnuncio || null,
        adDescription: descricaoAnuncio,
        callToAction: callToAction,
        menuUrl: linkCardapio
      };

      if (tipoAnuncio === 'imagem') {
        headers['Content-Type'] = 'multipart/form-data';
        dataToSend = new FormData();
        // Anexar todos os campos comuns
        Object.keys(commonData).forEach(key => {
          if (key === 'location') {
            dataToSend.append('location[latitude]', commonData.location.latitude);
            dataToSend.append('location[longitude]', commonData.location.longitude);
            dataToSend.append('location[radius]', commonData.location.radius);
          } else if (commonData[key] !== null && commonData[key] !== undefined) {
            dataToSend.append(key, commonData[key]);
          }
        });
        dataToSend.append('imageFile', imagem); // Anexar o arquivo de imagem
      } else { // tipoAnuncio === 'post'
        headers['Content-Type'] = 'application/json';
        dataToSend = { ...commonData, postUrl: linkPublicacao };
      }

      console.log('Enviando dados para:', endpoint, dataToSend);

      // Enviar requisição
      const response = await axios({
        method: 'post',
        url: endpoint,
        data: dataToSend,
        headers: headers
      });

      console.log('Resposta da API:', response.data);
      toast({ title: "Sucesso!", description: response.data.message || "Campanha criada com sucesso!" });

      // Limpar formulário
      // (Opcional: manter alguns campos como conta e página selecionados?)
      setNomeCampanha('');
      setOrcamento(70);
      // setRaioAlcance(5); // Manter raio?
      setLinkCardapio('');
      setLinkPublicacao('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setDataTermino('');
      setTituloAnuncio('');
      setDescricaoAnuncio('');
      setCallToAction('LEARN_MORE');
      handleClearImage();
      // setSelectedAdAccount(''); // Manter selecionado?
      // setSelectedPage(''); // Manter selecionado?

      // Atualizar UI (se necessário, ex: lista de campanhas)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campanhaCreated', { detail: response.data }));
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

  // Lista de opções para Call to Action
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
    // Adicionar mais CTAs relevantes se necessário
  ];

  // Verifica se o usuário está conectado ao Meta
  const isMetaConnected = userInfo?.isMetaConnected === true;

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">
          Criar Anúncio Recomendado (Tráfego)
        </h2>
        <p className="text-sm text-gray-500">
          Configure sua campanha de tráfego com as opções recomendadas pelo Meta Ads.
        </p>

        {!isMetaConnected && (
           <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
             Conecte sua conta Meta Ads no seu perfil para criar anúncios.
           </div>
        )}

        {/* Seletores de Conta e Página */} 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <SelectInput
             id="adAccount"
             label="Conta de Anúncios Meta"
             value={selectedAdAccount}
             onChange={(e) => setSelectedAdAccount(e.target.value)}
             options={adAccountsList}
             placeholder="Selecione a Conta de Anúncios"
             required
             disabled={!isMetaConnected || adAccountsList.length === 0}
           />
           <SelectInput
             id="facebookPage"
             label="Página do Facebook"
             value={selectedPage}
             onChange={(e) => setSelectedPage(e.target.value)}
             options={pagesList}
             placeholder="Selecione a Página"
             required
             disabled={!isMetaConnected || pagesList.length === 0}
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lado esquerdo - Mapa e Raio */}
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
                value={raioAlcance}
                onChange={(e) => setRaioAlcance(parseInt(e.target.value))}
                min="1"
                max="80" // Limite máximo do raio
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!isMetaConnected}
              />
            </div>

            {/* Tipo de Anúncio */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                Tipo de Criativo *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="post"
                    checked={tipoAnuncio === 'post'}
                    onChange={() => setTipoAnuncio('post')}
                    className="mr-2"
                    disabled={!isMetaConnected}
                  />
                  Usar Publicação Existente
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="imagem"
                    checked={tipoAnuncio === 'imagem'}
                    onChange={() => setTipoAnuncio('imagem')}
                    className="mr-2"
                    disabled={!isMetaConnected}
                  />
                  Fazer Upload de Imagem
                </label>
              </div>
            </div>

            {/* Upload de Imagem */} 
            {tipoAnuncio === 'imagem' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Imagem para o Anúncio *
                </label>
                <div className="flex flex-col space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg, image/png, image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    disabled={!isMetaConnected}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer py-2 px-4 border rounded-md text-center ${isMetaConnected ? 'border-blue-500 text-blue-500 hover:bg-blue-50' : 'border-gray-300 text-gray-400 cursor-not-allowed'}`}
                  >
                    Selecionar Imagem (JPG, PNG, GIF - Máx 5MB)
                  </label>

                  {imagemPreview && (
                    <div className="relative mt-2 border rounded-md p-1 inline-block">
                      <img
                        src={imagemPreview}
                        alt="Preview"
                        className="max-h-40 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 leading-none"
                        aria-label="Remover imagem"
                        disabled={!isMetaConnected}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
             {/* Link da Publicação */} 
            {tipoAnuncio === 'post' && (
              <div className="mt-4">
                <label htmlFor="linkPublicacao" className="block text-sm font-medium mb-1">
                  Link da Publicação Existente *
                </label>
                <input
                  id="linkPublicacao"
                  type="url" // Usar type url para validação básica
                  value={linkPublicacao}
                  onChange={(e) => setLinkPublicacao(e.target.value)}
                  placeholder="https://facebook.com/suapagina/posts/123..."
                  className="w-full p-2 border rounded-md"
                  required={tipoAnuncio === 'post'}
                  disabled={!isMetaConnected}
                />
              </div>
            )}
          </div>

          {/* Lado direito - Formulário */}
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
                placeholder="Ex: Campanha de Tráfego - Verão"
                className="w-full p-2 border rounded-md"
                required
                disabled={!isMetaConnected}
              />
            </div>

            <div>
              <label htmlFor="orcamento" className="block text-sm font-medium mb-1">
                Orçamento Semanal (R$) *
              </label>
              <input
                id="orcamento"
                type="number"
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                min="70" // Mínimo recomendado
                step="1"
                className="w-full p-2 border rounded-md"
                required
                disabled={!isMetaConnected}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recomendamos um mínimo de R$70 por semana (R$10/dia).
              </p>
            </div>

            {/* Datas */} 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium mb-1">
                  Data de Início *
                </label>
                <input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!isMetaConnected}
                />
              </div>
              <div>
                <label htmlFor="dataTermino" className="block text-sm font-medium mb-1">
                  Data de Término (opcional)
                </label>
                <input
                  id="dataTermino"
                  type="date"
                  value={dataTermino}
                  onChange={(e) => setDataTermino(e.target.value)}
                  min={dataInicio || new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border rounded-md"
                  disabled={!isMetaConnected}
                />
              </div>
            </div>

            {/* Título do Anúncio (Opcional) */} 
            <div>
              <label htmlFor="tituloAnuncio" className="block text-sm font-medium mb-1">
                Título do Anúncio (opcional)
              </label>
              <input
                id="tituloAnuncio"
                type="text"
                value={tituloAnuncio}
                onChange={(e) => setTituloAnuncio(e.target.value)}
                placeholder="Ex: Peça já nosso Combo Especial!"
                className="w-full p-2 border rounded-md"
                maxLength={255} // Limite comum
                disabled={!isMetaConnected}
              />
            </div>

            {/* Descrição do Anúncio */} 
            <div>
              <label htmlFor="descricaoAnuncio" className="block text-sm font-medium mb-1">
                Texto Principal do Anúncio *
              </label>
              <textarea
                id="descricaoAnuncio"
                value={descricaoAnuncio}
                onChange={(e) => setDescricaoAnuncio(e.target.value)}
                placeholder="Descreva sua oferta ou restaurante aqui..."
                className="w-full p-2 border rounded-md"
                rows="4"
                required
                disabled={!isMetaConnected}
              />
            </div>

            {/* Call to Action */} 
            <div>
              <label htmlFor="callToAction" className="block text-sm font-medium mb-1">
                Botão de Ação (Call to Action) *
              </label>
              <select
                id="callToAction"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                className="w-full p-2 border rounded-md bg-white"
                required
                disabled={!isMetaConnected}
              >
                {ctaOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Link de Destino */} 
            <div>
              <label htmlFor="linkCardapio" className="block text-sm font-medium mb-1">
                Link de Destino (Ex: Cardápio, Site) *
              </label>
              <input
                id="linkCardapio"
                type="url"
                value={linkCardapio}
                onChange={(e) => setLinkCardapio(e.target.value)}
                placeholder="https://seurestaurante.com/cardapio"
                className="w-full p-2 border rounded-md"
                required
                disabled={!isMetaConnected}
              />
            </div>

          </div>
        </div>

        {/* Mensagem de erro */} 
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Botão de Envio */} 
        <button
          type="submit"
          className={`w-full py-3 text-white rounded-md font-medium ${isMetaConnected && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!isMetaConnected || loading}
        >
          {loading ? (
             <div className="flex items-center justify-center">
               <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
               Processando...
             </div>
          ) : 'Criar Campanha de Tráfego'}
        </button>

      </form>
    </div>
  );
};

export default CampanhaManual;

