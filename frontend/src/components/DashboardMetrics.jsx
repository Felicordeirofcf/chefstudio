// Componente DashboardMetrics corrigido sem dependência de api.ts
// Arquivo: frontend/src/components/DashboardMetrics.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Componente simplificado para dashboard de métricas
const DashboardMetrics = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    impressions: 1234,
    clicks: 89,
    spend: 567,
    ctr: 0.098
  });
  const [timeRange, setTimeRange] = useState('last_30_days');

  // Carregar métricas (simuladas para evitar dependência da API)
  useEffect(() => {
    // Simulação de métricas para demonstração
    const demoMetrics = {
      'today': {
        impressions: 234,
        clicks: 12,
        spend: 78,
        ctr: 0.051
      },
      'yesterday': {
        impressions: 345,
        clicks: 23,
        spend: 98,
        ctr: 0.067
      },
      'last_7_days': {
        impressions: 876,
        clicks: 54,
        spend: 234,
        ctr: 0.062
      },
      'last_30_days': {
        impressions: 1234,
        clicks: 89,
        spend: 567,
        ctr: 0.098
      }
    };

    // Atualizar métricas com base no período selecionado
    setMetrics(demoMetrics[timeRange] || demoMetrics.last_30_days);
  }, [timeRange]);

  // Função para formatar valores de métricas
  const formatMetricValue = (metric, value) => {
    if (metric === 'spend') return `R$ ${value}`;
    if (metric === 'ctr') return `${(value * 100).toFixed(2)}%`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h2 className="text-xl font-semibold mb-4">Métricas do Dashboard</h2>
      
      {/* Seletor de período */}
      <div className="mb-6">
        <label htmlFor="time-range" className="block text-sm font-medium mb-1">
          Período
        </label>
        <select
          id="time-range"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="last_7_days">Últimos 7 dias</option>
          <option value="last_30_days">Últimos 30 dias</option>
        </select>
      </div>
      
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">Impressões</h3>
          <p className="text-2xl font-bold">{formatMetricValue('impressions', metrics.impressions)}</p>
          <p className="text-xs text-gray-500">+10% vs mês passado</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">Cliques</h3>
          <p className="text-2xl font-bold">{formatMetricValue('clicks', metrics.clicks)}</p>
          <p className="text-xs text-gray-500">+2% vs mês passado</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">Gastos</h3>
          <p className="text-2xl font-bold">{formatMetricValue('spend', metrics.spend)}</p>
          <p className="text-xs text-gray-500">+5% vs mês passado</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500">Taxa de Cliques</h3>
          <p className="text-2xl font-bold">{formatMetricValue('ctr', metrics.ctr)}</p>
          <p className="text-xs text-gray-500">+1% vs mês passado</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;
