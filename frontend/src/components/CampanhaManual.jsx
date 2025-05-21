// Componente de campanha manual simplificado
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
  FormHelperText,
  Alert,
  Snackbar
} from '@mui/material';

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
              backgroundImage: 'url(https://maps.googleapis.com/maps/api/staticmap?center=São+Paulo,Brazil&zoom=12&size=600x400&key=YOUR_API_KEY)', 
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

        {/* Lado direito - Formulário Simplificado */}
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
                label="Link da Publicação"
                value={linkPublicacao}
                onChange={(e) => setLinkPublicacao(e.target.value)}
                placeholder="https://facebook.com/suapagina/posts/123..."
              />
            </Grid>
          </Grid>
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
            required
          />
        </Grid>

        {/* Upload de Imagem/Vídeo */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Imagem/Vídeo para o Anúncio
            </Typography>
            
            <input
              accept="image/*,video/*"
              style={{ display: 'none' }}
              id="imagem-video-upload"
              type="file"
              onChange={handleImagemVideoChange}
            />
            
            <label htmlFor="imagem-video-upload">
              <Button variant="outlined" component="span">
                Selecionar Arquivo
              </Button>
            </label>
            
            {imagemPreview && (
              <Box mt={2} textAlign="center">
                <img 
                  src={imagemPreview} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '200px' }} 
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Botão de Envio */}
        <Grid item xs={12}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button 
            type="submit" 
            fullWidth 
            variant="contained" 
            color="primary" 
            size="large" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Criar Anúncio no Meta Ads'}
          </Button>
        </Grid>
      </Grid>

      {/* Alerta de sucesso */}
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={handleCloseSuccess}
      >
        <Alert onClose={handleCloseSuccess} severity="success">
          Anúncio criado com sucesso! Verifique a seção de produtos anunciados abaixo.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CampanhaManual;
