import React from 'react';
import SimpleMetaAdsConnect from '../components/SimpleMetaAdsConnect';
import ProdutosAnunciados from '../ProdutosAnunciados';
import DashboardMetrics from '../DashboardMetrics';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Métricas do Dashboard */}
      <div className="mb-8">
        <DashboardMetrics />
      </div>

      {/* Seção de Criação de Anúncio Simplificada */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-2xl font-bold mb-4">
          Criar Anúncio Manualmente
        </h2>
        <SimpleMetaAdsConnect />
      </div>

      {/* Seção de Produtos Anunciados */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <ProdutosAnunciados />
      </div>
    </div>
  );
};

export default Dashboard;
