// Componente para integração com Facebook e exibição de métricas no dashboard
// Arquivo: frontend/src/components/MetaAdsMetrics.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Grid, CircularProgress, Paper } from '@mui/material';

const MetricCard = ({ title, value, change, loading }) => {
  const isPositive = change > 0;
  const changeText = `${isPositive ? '+' : ''}${change}% vs mês passado`;
  
  return (
    <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" height="60px">
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Typography variant="h4" component="div" fontWeight="bold" gutterBottom>
            {value}
          </Typography>
          
          <Typography 
            variant="caption" 
            color={isPositive ? 'success.main' : 'error.main'}
          >
            {changeText}
          </Typography>
        </>
      )}
    </Paper>
  );
};

const MetaAdsMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        
        // Obter token do localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        if (!userInfo.token) {
          throw new Error('Usuário não autenticado');
        }
        
        // Buscar métricas da API
        const response = await axios.get('/api/meta/metrics', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`
          }
        });
        
        setMetrics(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar métricas do Meta Ads:', error);
        setError('Não foi possível carregar as métricas do Meta Ads.');
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Atualizar métricas a cada 5 minutos
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Formatar valores para exibição
  const formatCurrency = (value) => {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
  };
  
  const formatNumber = (value) => {
    return parseInt(value).toLocaleString('pt-BR');
  };
  
  const formatPercentage = (value) => {
    return `${(parseFloat(value) * 100).toFixed(2).replace('.', ',')}%`;
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Impressões"
          value={metrics ? formatNumber(metrics.impressions) : '0'}
          change={10}
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Gastos"
          value={metrics ? formatCurrency(metrics.spend) : 'R$ 0,00'}
          change={5}
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="Total de Anúncios"
          value={metrics ? formatNumber(metrics.totalAds) : '0'}
          change={-3}
          loading={loading}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          title="CTR"
          value={metrics ? formatPercentage(metrics.ctr) : '0%'}
          change={1}
          loading={loading}
        />
      </Grid>
    </Grid>
  );
};

export default MetaAdsMetrics;
