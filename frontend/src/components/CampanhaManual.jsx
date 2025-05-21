// Modificação para o componente de campanha manual
// Arquivo: frontend/src/components/CampanhaManual.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Slider, 
  Grid, 
  Paper,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import FacebookPostSelector from './FacebookPostSelector';

const CampanhaManual = () => {
  // Estados para os campos do formulário
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [contaAnuncio, setContaAnuncio] = useState('');
  const [orcamento, setOrcamento] = useState(70);
  const [raioAlcance, setRaioAlcance] = useState(5);
  const [linkPublicacao, setLinkPublicacao] = useState('');
  const [textoAnuncio, setTextoAnuncio] = useState('');
  
  // Estados para a publicação selecionada
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Estados para controle de carregamento e erros
  const [loading, setLoading] = useState(false);
  const [loadingAdAccount, setLoadingAdAccount] = useState(true);
  const [error, setError] = useState(null);
  
  // Buscar ID da conta de anúncio automaticamente ao carregar o componente
  useEffect(() => {
    const fetchAdAccount = async () => {
      try {
        setLoadingAdAccount(true);
        
        // Obter token do localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        if (!userInfo.token) {
          throw new Error('Usuário não autenticado');
        }
        
        // Buscar contas de anúncio da API
        const response = await axios.get('/api/meta/adaccounts', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`
          }
        });
        
        // Se houver contas de anúncio, usar a primeira
        if (response.data && response.data.length > 0) {
          setContaAnuncio(response.data[0].id);
        }
        
        setLoadingAdAccount(false);
      } catch (error) {
        console.error('Erro ao buscar conta de anúncio:', error);
        setLoadingAdAccount(false);
      }
    };

    fetchAdAccount();
  }, []);
  
  // Função para lidar com a seleção de uma publicação
  const handleSelectPost = (post) => {
    setSelectedPost(post);
    setTextoAnuncio(post.message);
    setLinkPublicacao(post.permalink_url);
  };
  
  // Função para criar a campanha
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nomeCampanha || !contaAnuncio) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Obter token do localStorage
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (!userInfo.token) {
        throw new Error('Usuário não autenticado');
      }
      
      // Enviar dados da campanha para a API
      const response = await axios.post('/api/meta/campaigns', {
        name: nomeCampanha,
        adAccountId: contaAnuncio,
        budget: orcamento,
        radius: raioAlcance,
        postId: selectedPost?.id,
        postUrl: linkPublicacao,
        adText: textoAnuncio
      }, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });
      
      // Limpar formulário após sucesso
      setNomeCampanha('');
      setOrcamento(70);
      setRaioAlcance(5);
      setLinkPublicacao('');
      setTextoAnuncio('');
      setSelectedPost(null);
      
      // Exibir mensagem de sucesso (pode ser implementado com um snackbar ou alerta)
      alert('Campanha criada com sucesso!');
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      setError('Erro ao criar campanha. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" gutterBottom>
        Configurações da Campanha Manual
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Defina os parâmetros para sua campanha de anúncios no Meta Ads.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Lado esquerdo - Mapa e Raio */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 0, 
              height: 300, 
              backgroundImage: 'url(https://via.placeholder.com/600x400?text=Mapa)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative'
            }}
          >
            <Box 
              sx={{ 
                position: 'absolute', 
                bottom: 20, 
                left: 20, 
                right: 20, 
                bgcolor: 'rgba(255,255,255,0.8)',
                p: 2,
                borderRadius: 1
              }}
            >
              <Typography gutterBottom>
                Raio de Alcance ({raioAlcance} Km)
              </Typography>
              <Slider
                value={raioAlcance}
                onChange={(e, newValue) => setRaioAlcance(newValue)}
                min={1}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Lado direito - Formulário */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Nome da Campanha"
                value={nomeCampanha}
                onChange={(e) => setNomeCampanha(e.target.value)}
                placeholder="Ex: Campanha de Verão"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="ID da Conta de Anúncios (act_xxxxxxxxxx)"
                value={contaAnuncio}
                onChange={(e) => setContaAnuncio(e.target.value)}
                placeholder="Conecte ao Meta Ads para carregar ou insira manualmente"
                InputProps={{
                  readOnly: loadingAdAccount,
                  startAdornment: loadingAdAccount ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : null,
                }}
              />
              <FormHelperText>
                Você encontrará o ID da sua conta de anúncios no Gerenciador de Anúncios do Facebook ou conecte sua conta Meta.
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Orçamento semanal (R$)"
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                InputProps={{ inputProps: { min: 10 } }}
              />
              <FormHelperText>
                Para melhores resultados recomendamos um orçamento mínimo semanal de R$70.
              </FormHelperText>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Link da Publicação (Opcional)"
                value={linkPublicacao}
                onChange={(e) => setLinkPublicacao(e.target.value)}
                placeholder="https://facebook.com/suapagina/posts/123..."
              />
            </Grid>
          </Grid>
        </Grid>
        
        {/* Seletor de Publicações do Facebook */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <FacebookPostSelector 
              onSelectPost={handleSelectPost}
              selectedPostId={selectedPost?.id}
            />
          </Paper>
        </Grid>
        
        {/* Texto do Anúncio */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Texto do Anúncio"
            value={textoAnuncio}
            onChange={(e) => setTextoAnuncio(e.target.value)}
            placeholder="Ex: Promoção especial esta semana!"
          />
        </Grid>
        
        {/* Estimativas e Botão de Envio */}
        <Grid item xs={12}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Estimativas da campanha:
            </Typography>
            <Typography variant="body2">
              Alcance Estimado: 5.000 - 7.500 pessoas
            </Typography>
            <Typography variant="body2">
              Cliques Estimados: 350 - 450
            </Typography>
          </Box>
          
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Criar Campanha Manual no Meta Ads'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CampanhaManual;
