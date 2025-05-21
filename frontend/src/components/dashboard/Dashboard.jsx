// Componente Dashboard principal que integra todos os componentes
// Arquivo: frontend/src/components/dashboard/Dashboard.jsx
import React from 'react';
import CampanhaManual from '../CampanhaManual';
import ProdutosAnunciados from '../ProdutosAnunciados';
import DashboardMetrics from '../DashboardMetrics';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user, loading } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Métricas do Dashboard */}
      <div className="mb-8">
        <DashboardMetrics />
      </div>

      {/* Seção de Criação de Anúncio Manual */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-2xl font-bold mb-4">
          Criar Anúncio Manualmente
        </h2>
        <CampanhaManual />
      </div>

      {/* Seção de Produtos Anunciados */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <ProdutosAnunciados />
      </div>
    </div>
  );
};

export default Dashboard;
