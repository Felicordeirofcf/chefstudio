// Componente DashboardMetrics corrigido para usar api.ts sem simulações
// Arquivo: frontend/src/components/DashboardMetrics.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

// Componente simplificado para dashboard de métricas
const DashboardMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    impressions: 0,
    clicks: 0,
    spend: 0,
    ctr: 0
  });
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [error, setError] = useState(null);
  const [metaConnected, setMetaConnected] = useState(false);

  // Verificar conexão com Meta e carregar métricas reais
  useEffect(() => {
    const checkConnectionAndFetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verificar status de conexão com Meta primeiro
        try {
          const connectionResponse = await api.get('/api/meta/connection-status');
          const isConnected = connectionResponse.data?.connected === true || 
                             connectionResponse.data?.status === 'connected';
          
          setMetaConnected(isConnected);
          
          if (!isConnected) {
            setError('Você precisa conectar sua conta ao Meta Ads para ver métricas reais.');
            setLoading(false);
            return;
          }
        } catch (connErr) {
          console.error('Erro ao verificar conexão com Meta:', connErr);
          setMetaConnected(false);
          setError('Não foi possível verificar sua conexão com o Meta Ads.');
          setLoading(false);
          return;
        }
        
        // Se conectado ao Meta, buscar métricas reais
        const response = await api.get(`/api/meta/metrics?timeRange=${timeRange}`);
        
        if (response.data && typeof response.data === 'object') {
          // Mapear dados da API para o formato esperado
          const apiMetrics = {
            impressions: response.data.impressions || response.data.impressoes || 0,
            clicks: response.data.clicks || response.data.cliques || 0,
            spend: response.data.spend || response.data.gastos || 0,
            ctr: response.data.ctr || response.data.taxa_cliques || 0
          };
          
          setMetrics(apiMetrics);
        } else {
          setError('Formato de resposta inesperado da API de métricas.');
        }
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
        setError(err.response?.data?.message || 'Erro ao carregar métricas do Meta Ads.');
      } finally {
        setLoading(false);
      }
    };
    
    checkConnectionAndFetchMetrics();
  }, [timeRange]);

  // Função para formatar valores de métricas
  const formatMetricValue = (metric, value) => {
    if (!value && value !== 0) return '0';
    
    if (metric === 'spend') return `R$ ${value}`;
    if (metric === 'ctr') return `${(value * 100).toFixed(2)}%`;
    return value.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h2 className="text-xl font-semibold mb-4">Métricas do Meta Ads</h2>
      
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
          disabled={loading || !metaConnected}
        >
          <option value="today">Hoje</option>
          <option value="yesterday">Ontem</option>
          <option value="last_7_days">Últimos 7 dias</option>
          <option value="last_30_days">Últimos 30 dias</option>
        </select>
      </div>
      
      {/* Indicador de carregamento */}
      {loading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {/* Mensagem de erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4">
          {error}
          {!metaConnected && (
            <div className="mt-2">
              <a href="/connect-meta" className="text-blue-600 underline">
                Conectar ao Meta Ads
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* Cards de métricas */}
      {!error && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Impressões</h3>
            <p className="text-2xl font-bold">{formatMetricValue('impressions', metrics?.impressions)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Cliques</h3>
            <p className="text-2xl font-bold">{formatMetricValue('clicks', metrics?.clicks)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Gastos</h3>
            <p className="text-2xl font-bold">{formatMetricValue('spend', metrics?.spend)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Taxa de Cliques</h3>
            <p className="text-2xl font-bold">{formatMetricValue('ctr', metrics?.ctr)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMetrics;
