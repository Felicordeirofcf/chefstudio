// Componente Dashboard principal que integra todos os componentes
// Arquivo: frontend/src/components/dashboard/Dashboard.jsx
import React from 'react';
import { Box, Container, Grid, Typography, Paper } from '@mui/material';
import CampanhaManual from '../CampanhaManual';
import ProdutosAnunciados from '../ProdutosAnunciados';
import MetaAdsConnection from '../MetaAdsConnection';
import DashboardMetrics from '../DashboardMetrics';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user, loading } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Métricas do Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <DashboardMetrics />
        </Grid>
      </Grid>

      {/* Conexão com Meta Ads */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <MetaAdsConnection />
        </Grid>
      </Grid>

      {/* Seção de Criação de Anúncio Manual */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Criar Anúncio Manualmente
        </Typography>
        <CampanhaManual />
      </Paper>

      {/* Seção de Produtos Anunciados */}
      <Paper sx={{ p: 3 }}>
        <ProdutosAnunciados />
      </Paper>
    </Container>
  );
};

export default Dashboard;
