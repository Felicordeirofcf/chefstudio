// Componente para exibir produtos anunciados com tratamento de erros aprimorado
// Arquivo: frontend/src/components/ProdutosAnunciados.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const ProdutosAnunciados = () => {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar anúncios ao inicializar o componente
  const carregarAnuncios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Tentar primeiro endpoint usando a instância api centralizada
      try {
        const response = await api.get('/meta/campaigns');
        
        // Garantir que o resultado seja um array
        if (Array.isArray(response.data)) {
          setAnuncios(response.data);
        } else if (response.data && Array.isArray(response.data.campaigns)) {
          // Caso a API retorne um objeto com propriedade campaigns
          setAnuncios(response.data.campaigns);
        } else {
          // Caso a API retorne um formato inesperado, usar array vazio
          console.warn('Formato de resposta inesperado:', response.data);
          setAnuncios([]);
        }
      } catch (err) {
        // Se o primeiro endpoint falhar, tentar endpoint alternativo
        if (err.response && err.response.status === 404) {
          const altResponse = await api.get('/campaigns');
          
          // Garantir que o resultado seja um array
          if (Array.isArray(altResponse.data)) {
            setAnuncios(altResponse.data);
          } else if (altResponse.data && Array.isArray(altResponse.data.campaigns)) {
            setAnuncios(altResponse.data.campaigns);
          } else {
            setAnuncios([]);
          }
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
      setError('Não foi possível carregar os anúncios. Por favor, tente novamente.');
      // Garantir que anuncios seja sempre um array mesmo em caso de erro
      setAnuncios([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar anúncios ao inicializar
  useEffect(() => {
    carregarAnuncios();
  }, []);

  // Ouvir evento de criação de anúncio para atualizar a lista
  useEffect(() => {
    const handleAnuncioCreated = () => {
      carregarAnuncios();
    };
    
    window.addEventListener('anuncioCreated', handleAnuncioCreated);
    
    return () => {
      window.removeEventListener('anuncioCreated', handleAnuncioCreated);
    };
  }, []);

  if (loading && anuncios.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error && anuncios.length === 0) {
    return (
      <div className="p-4 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  if (!Array.isArray(anuncios) || anuncios.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">
          Produtos Anunciados
        </h2>
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
          Você ainda não tem anúncios criados. Use o formulário acima para criar seu primeiro anúncio.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">
        Produtos Anunciados
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Todos os anúncios que você criou aparecem aqui. Clique em um anúncio para ver mais detalhes.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.isArray(anuncios) && anuncios.map((anuncio) => (
          <div key={anuncio?.id || Math.random().toString(36)} className="border rounded-md overflow-hidden flex flex-col h-full bg-white shadow-sm">
            <img
              src={anuncio?.imageUrl || 'https://via.placeholder.com/300x140?text=Anúncio'}
              alt={anuncio?.name || 'Anúncio'}
              className="h-36 w-full object-cover"
            />
            <div className="p-4 flex-grow">
              <h3 className="font-semibold text-lg mb-1 truncate">
                {anuncio?.name || 'Anúncio sem nome'}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {anuncio?.adText || 'Sem descrição'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  R$ {anuncio?.budget || 0}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {anuncio?.radius || 0} km
                </span>
              </div>
            </div>
            <div className="border-t p-3 flex justify-between">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                Ver Detalhes
              </button>
              <button className="text-sm text-purple-600 hover:text-purple-800">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProdutosAnunciados;
