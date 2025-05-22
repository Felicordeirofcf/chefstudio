// Componente para integração com Facebook e seleção de publicações
// Arquivo: frontend/src/components/FacebookPostSelector.jsx

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Box, Typography, Paper, Grid, CircularProgress, styled } from '@mui/material';

const PostContainer = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid #ddd',
  backgroundColor: selected ? '#f3e5f5' : 'white',
  '&:hover': {
    backgroundColor: selected ? '#f3e5f5' : '#f9f9f9',
  }
}));

const PostImage = styled(Box)({
  width: 80,
  height: 80,
  backgroundColor: '#ddd',
  marginRight: 15,
  borderRadius: 4,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

const FacebookPostSelector = ({ onSelectPost, selectedPostId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Função para buscar publicações do Facebook
    const fetchFacebookPosts = async () => {
      try {
        setLoading(true);
        
        // Buscar publicações da API usando a instância centralizada
        // Não é necessário adicionar o token manualmente, pois o interceptor em api.ts já faz isso
        const response = await api.get('/meta/posts');
        
        setPosts(response.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar publicações do Facebook:', error);
        setError('Não foi possível carregar suas publicações do Facebook. Verifique sua conexão com o Meta Ads.');
        setLoading(false);
        
        // Dados de exemplo para demonstração em caso de erro
        setPosts([
          {
            id: 'post1',
            message: 'Promoção especial esta semana! Venha experimentar nosso novo cardápio.',
            created_time: '2025-05-20T10:30:00',
            picture: 'https://via.placeholder.com/80'
          },
          {
            id: 'post2',
            message: 'Novo horário de funcionamento a partir de segunda-feira!',
            created_time: '2025-05-18T14:15:00',
            picture: 'https://via.placeholder.com/80'
          },
          {
            id: 'post3',
            message: 'Conheça nosso prato especial do chef, disponível apenas neste fim de semana!',
            created_time: '2025-05-15T09:45:00',
            picture: 'https://via.placeholder.com/80'
          }
        ]);
      }
    };

    fetchFacebookPosts();
  }, []);

  const handleSelectPost = (post) => {
    if (onSelectPost) {
      onSelectPost(post);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress size={30} />
        <Typography variant="body2" ml={2}>
          Carregando publicações...
        </Typography>
      </Box>
    );
  }

  if (error && posts.length === 0) {
    return (
      <Box p={2} bgcolor="#fff3e0" borderRadius={1}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Selecione uma publicação do Facebook para promover
      </Typography>
      
      <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
        {posts.map((post) => (
          <PostContainer 
            key={post.id} 
            selected={selectedPostId === post.id}
            onClick={() => handleSelectPost(post)}
          >
            <PostImage 
              sx={{ 
                backgroundImage: post.picture ? `url(${post.picture})` : 'none'
              }} 
            />
            <Box>
              <Typography variant="body2">{post.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                Publicado em {formatDate(post.created_time)}
              </Typography>
            </Box>
          </PostContainer>
        ))}
      </Box>
    </Box>
  );
};

export default FacebookPostSelector;
