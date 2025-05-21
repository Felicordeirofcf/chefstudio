// Componente para exibir produtos anunciados usando componentes nativos
// Arquivo: frontend/src/components/ProdutosAnunciados.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const ProdutosAnunciados = () => {
  const { user } = useAuth();
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar anúncios ao inicializar o componente
  const carregarAnuncios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user || !user.token) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await axios.get('/api/meta/campaigns', {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        timeout: 8000 // Timeout para evitar requisições pendentes
      });
      
      setAnuncios(response.data);
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
      setError('Não foi possível carregar os anúncios. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar anúncios ao inicializar e quando o usuário mudar
  useEffect(() => {
    if (user) {
      carregarAnuncios();
    }
  }, [user]);

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

  if (anuncios.length === 0) {
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
        {anuncios.map((anuncio) => (
          <div key={anuncio.id} className="border rounded-md overflow-hidden flex flex-col h-full bg-white shadow-sm">
            <img
              src={anuncio.imageUrl || 'https://via.placeholder.com/300x140?text=Anúncio'}
              alt={anuncio.name}
              className="h-36 w-full object-cover"
            />
            <div className="p-4 flex-grow">
              <h3 className="font-semibold text-lg mb-1 truncate">
                {anuncio.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {anuncio.adText}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  R$ {anuncio.budget}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {anuncio.radius} km
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
