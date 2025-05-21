// Componente de campanha manual simplificado usando componentes nativos
// Arquivo: frontend/src/components/CampanhaManual.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CampanhaManual = () => {
  // Estados para os campos do formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [textoAnuncio, setTextoAnuncio] = useState('');
  const [imagemVideo, setImagemVideo] = useState(null);
  const [imagemPreview, setImagemPreview] = useState('');

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
      if (!userInfo || !userInfo.token) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }

      // Preparar FormData para upload de imagem/vídeo
      const formData = new FormData();
      formData.append('name', nomeCampanha);
      formData.append('budget', orcamento);
      formData.append('radius', raioAlcance);
      formData.append('adText', textoAnuncio);
      
      if (linkPublicacao) {
        formData.append('postUrl', linkPublicacao);
      }
      
      if (imagemVideo) {
        formData.append('media', imagemVideo);
      }

      // Enviar dados da campanha para a API
      const response = await axios.post('/api/meta/campaigns', formData, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

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
      
      // Atualizar a lista de produtos anunciados (pode ser implementado com um callback)
      if (typeof window !== 'undefined') {
        // Disparar evento para atualizar a lista de produtos anunciados
        window.dispatchEvent(new CustomEvent('anuncioCreated', { detail: response.data }));
      }
      
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      setError(error.response?.data?.message || 'Erro ao criar campanha. Por favor, tente novamente.');
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
              className="relative h-[300px] bg-cover bg-center rounded-md overflow-hidden"
              style={{ 
                backgroundImage: 'url(https://maps.googleapis.com/maps/api/staticmap?center=São+Paulo,Brazil&zoom=12&size=600x400&key=YOUR_API_KEY)'
              }}
            >
              <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-80 p-4 rounded">
                <label className="block mb-2">
                  Raio de Alcance ({raioAlcance} Km)
                </label>
                <input
                  type="range"
                  value={raioAlcance}
                  onChange={(e) => setRaioAlcance(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full"
                />
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
