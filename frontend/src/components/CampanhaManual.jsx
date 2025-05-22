import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CampanhaManual = () => {
  // Estados para os campos do formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkCardapio, setLinkCardapio] = useState('');
  const [linkPublicacao, setLinkPublicacao] = useState('');
  
  // Novos campos adicionados
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [tituloAnuncio, setTituloAnuncio] = useState('');
  const [descricaoAnuncio, setDescricaoAnuncio] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  const [imagem, setImagem] = useState(null);
  const [imagemPreview, setImagemPreview] = useState('');
  const [tipoAnuncio, setTipoAnuncio] = useState('post'); // 'post' ou 'imagem'
  
  // Referência para o input de arquivo
  const fileInputRef = useRef(null);
  
  // Estados para o mapa
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [circle, setCircle] = useState(null);

  // Estados para controle de carregamento e erros
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Definir data de início padrão como hoje
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

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

  // Lidar com a seleção de imagem
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagem(file);
      setTipoAnuncio('imagem');
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result);
      };
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
    
    if (!nomeCampanha || !orcamento) {
      setError('Por favor, preencha o nome da campanha e o orçamento.');
      return;
    }

    if (!dataInicio) {
      setError('Por favor, selecione uma data de início para a campanha.');
      return;
    }

    if (tipoAnuncio === 'post' && !linkPublicacao) {
      setError('Por favor, forneça o link da publicação ou selecione uma imagem para o anúncio.');
      return;
    }

    if (tipoAnuncio === 'imagem' && !imagem) {
      setError('Por favor, selecione uma imagem para o anúncio ou forneça o link de uma publicação.');
      return;
    }

    if (dataTermino && new Date(dataTermino) <= new Date(dataInicio)) {
      setError('A data de término deve ser posterior à data de início.');
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
      const campaignData = new FormData();
      
      // Campos obrigatórios
      campaignData.append('campaignName', nomeCampanha);
      campaignData.append('dailyBudget', parseFloat(orcamento) / 7); // Converter orçamento semanal para diário
      campaignData.append('radius', raioAlcance);
      campaignData.append('startDate', dataInicio);
      
      // Campos opcionais
      if (dataTermino) campaignData.append('endDate', dataTermino);
      if (tituloAnuncio) campaignData.append('adTitle', tituloAnuncio);
      if (descricaoAnuncio) campaignData.append('adDescription', descricaoAnuncio);
      if (callToAction) campaignData.append('callToAction', callToAction);
      if (linkCardapio) campaignData.append('menuUrl', linkCardapio);
      
      // Campos específicos por tipo de anúncio
      if (tipoAnuncio === 'post' && linkPublicacao) {
        campaignData.append('postUrl', linkPublicacao);
      }
      
      if (tipoAnuncio === 'imagem' && imagem) {
        campaignData.append('image', imagem);
      }
      
      // Campos adicionais que podem ser necessários
      campaignData.append('location[latitude]', -23.5505);
      campaignData.append('location[longitude]', -46.6333);

      console.log('Enviando dados para criação de campanha:', {
        tipo: tipoAnuncio,
        nome: nomeCampanha,
        orcamento: parseFloat(orcamento) / 7,
        raio: raioAlcance,
        dataInicio,
        dataTermino,
        titulo: tituloAnuncio,
        descricao: descricaoAnuncio,
        cta: callToAction,
        temImagem: !!imagem
      });

      // Determinar qual endpoint usar com base no tipo de anúncio
      let endpoint = `${API_BASE_URL}/meta/create-ad-from-post`;
      
      if (tipoAnuncio === 'imagem') {
        endpoint = `${API_BASE_URL}/meta/create-from-image`;
      }

      // Enviar dados da campanha para a API
      const response = await axios({
        method: 'post',
        url: endpoint,
        data: tipoAnuncio === 'imagem' ? campaignData : {
          campaignName: nomeCampanha,
          dailyBudget: parseFloat(orcamento) / 7,
          radius: raioAlcance,
          startDate: dataInicio,
          endDate: dataTermino || null,
          adTitle: tituloAnuncio || null,
          adDescription: descricaoAnuncio || null,
          callToAction: callToAction || null,
          menuUrl: linkCardapio || null,
          postUrl: linkPublicacao || null,
          location: {
            latitude: -23.5505,
            longitude: -46.6333
          }
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': tipoAnuncio === 'imagem' ? 'multipart/form-data' : 'application/json',
          'Accept': 'application/json'
        }
      });

      // Limpar formulário após sucesso
      setNomeCampanha('');
      setOrcamento(70);
      setRaioAlcance(5);
      setLinkCardapio('');
      setLinkPublicacao('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setDataTermino('');
      setTituloAnuncio('');
      setDescricaoAnuncio('');
      setCallToAction('LEARN_MORE');
      setImagem(null);
      setImagemPreview('');
      setTipoAnuncio('post');
      
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
  ];

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

            {/* Tipo de Anúncio */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                Tipo de Anúncio
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="post"
                    checked={tipoAnuncio === 'post'}
                    onChange={() => setTipoAnuncio('post')}
                    className="mr-2"
                  />
                  Publicação Existente
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipoAnuncio"
                    value="imagem"
                    checked={tipoAnuncio === 'imagem'}
                    onChange={() => setTipoAnuncio('imagem')}
                    className="mr-2"
                  />
                  Upload de Imagem
                </label>
              </div>
            </div>

            {/* Upload de Imagem (visível apenas quando tipoAnuncio === 'imagem') */}
            {tipoAnuncio === 'imagem' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">
                  Imagem para o Anúncio
                </label>
                <div className="flex flex-col space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer py-2 px-4 border border-blue-500 text-blue-500 rounded-md text-center hover:bg-blue-50"
                  >
                    Selecionar Imagem
                  </label>
                  
                  {imagemPreview && (
                    <div className="relative mt-2">
                      <img
                        src={imagemPreview}
                        alt="Preview"
                        className="max-h-40 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
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

            {/* Data de Início */}
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
              />
            </div>

            {/* Data de Término */}
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
              />
            </div>

            {/* Título do Anúncio */}
            <div>
              <label htmlFor="tituloAnuncio" className="block text-sm font-medium mb-1">
                Título do Anúncio
              </label>
              <input
                id="tituloAnuncio"
                type="text"
                value={tituloAnuncio}
                onChange={(e) => setTituloAnuncio(e.target.value)}
                placeholder="Ex: Promoção Especial de Verão"
                className="w-full p-2 border rounded-md"
              />
            </div>

            {/* Descrição do Anúncio */}
            <div>
              <label htmlFor="descricaoAnuncio" className="block text-sm font-medium mb-1">
                Descrição do Anúncio
              </label>
              <textarea
                id="descricaoAnuncio"
                value={descricaoAnuncio}
                onChange={(e) => setDescricaoAnuncio(e.target.value)}
                placeholder="Ex: Venha experimentar nossos pratos especiais com 20% de desconto!"
                className="w-full p-2 border rounded-md"
                rows="3"
              />
            </div>

            {/* Call to Action */}
            <div>
              <label htmlFor="callToAction" className="block text-sm font-medium mb-1">
                Botão de Ação (Call to Action)
              </label>
              <select
                id="callToAction"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {ctaOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Link do Cardápio */}
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
            
            {/* Link da Publicação (visível apenas quando tipoAnuncio === 'post') */}
            {tipoAnuncio === 'post' && (
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
            )}
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
