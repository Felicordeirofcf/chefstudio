// Componente para exibir produtos anunciados
// Arquivo: frontend/src/components/ProdutosAnunciados.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && anuncios.length === 0) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (anuncios.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Produtos Anunciados
        </Typography>
        <Alert severity="info">
          Você ainda não tem anúncios criados. Use o formulário acima para criar seu primeiro anúncio.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Produtos Anunciados
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Todos os anúncios que você criou aparecem aqui. Clique em um anúncio para ver mais detalhes.
      </Typography>
      
      <Grid container spacing={3}>
        {anuncios.map((anuncio) => (
          <Grid item xs={12} sm={6} md={3} key={anuncio.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="140"
                image={anuncio.imageUrl || 'https://via.placeholder.com/300x140?text=Anúncio'}
                alt={anuncio.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div" noWrap>
                  {anuncio.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {anuncio.adText}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`R$ ${anuncio.budget}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                    sx={{ mr: 1, mt: 1 }} 
                  />
                  <Chip 
                    label={`${anuncio.radius} km`} 
                    size="small" 
                    color="secondary" 
                    variant="outlined" 
                    sx={{ mt: 1 }} 
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">
                  Ver Detalhes
                </Button>
                <Button size="small" color="secondary">
                  Editar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProdutosAnunciados;
