import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2 } from 'lucide-react';
import { FaFacebook, FaChartLine, FaAd } from 'react-icons/fa';
import axios from 'axios';

const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d'); // 7d, 30d, 90d

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obter token JWT do localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Obter dados do usuário do localStorage
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      // Verificar se o usuário está conectado ao Meta
      if (!user || user.metaConnectionStatus !== 'connected') {
        // Se não estiver conectado, usar dados simulados
        setMetrics({
          impressions: 1234,
          reach: 567,
          clicks: 89,
          spend: 9.8,
          totalAds: 5,
          activeAds: 3,
          simulated: true
        });
        setLoading(false);
        return;
      }

      // Configurar URL da API
      const apiUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      
      // Calcular datas com base no período selecionado
      const today = new Date();
      const since = new Date(today);
      
      if (period === '7d') {
        since.setDate(today.getDate() - 7);
      } else if (period === '30d') {
        since.setDate(today.getDate() - 30);
      } else if (period === '90d') {
        since.setDate(today.getDate() - 90);
      }
      
      const sinceStr = since.toISOString().split('T')[0];
      const untilStr = today.toISOString().split('T')[0];

      // Fazer requisição para obter métricas
      const response = await axios.get(
        `${apiUrl}/api/meta/metrics`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            since: sinceStr,
            until: untilStr
          }
        }
      );

      setMetrics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      setError(error.message || 'Erro ao obter métricas');
      
      // Em caso de erro, usar dados simulados
      setMetrics({
        impressions: 1234,
        reach: 567,
        clicks: 89,
        spend: 9.8,
        totalAds: 5,
        activeAds: 3,
        simulated: true
      });
      
      setLoading(false);
    }
  };

  // Formatar valores para exibição
  const formatValue = (value, type) => {
    if (value === undefined || value === null) return '-';
    
    if (type === 'currency') {
      return `R$ ${parseFloat(value).toFixed(2)}`;
    }
    
    if (type === 'percentage') {
      return `${parseFloat(value).toFixed(2)}%`;
    }
    
    // Para números grandes, formatar com K, M, etc.
    if (type === 'number' && value >= 1000) {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
    }
    
    return value.toString();
  };

  // Calcular variação percentual (simulada para demonstração)
  const getVariation = (metric) => {
    // Em uma implementação real, isso viria da API comparando períodos
    const variations = {
      impressions: 12.5,
      reach: -5.3,
      clicks: 8.9,
      spend: 3.2,
      totalAds: 0,
      activeAds: 20
    };
    
    return variations[metric] || 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Métricas de Marketing</h2>
        <Tabs defaultValue="30d" value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Métrica 1: Impressões */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Métrica 1</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(metrics.impressions, 'number')}</div>
              <div className={`text-xs flex items-center ${getVariation('impressions') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getVariation('impressions') >= 0 ? '+' : ''}{getVariation('impressions')}% vs mês passado
              </div>
              <CardDescription className="text-xs mt-2">Impressões totais</CardDescription>
            </CardContent>
          </Card>

          {/* Métrica 2: Gastos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Métrica 2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(metrics.spend, 'currency')}</div>
              <div className={`text-xs flex items-center ${getVariation('spend') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getVariation('spend') >= 0 ? '+' : ''}{getVariation('spend')}% vs mês passado
              </div>
              <CardDescription className="text-xs mt-2">Investimento total</CardDescription>
            </CardContent>
          </Card>

          {/* Métrica 3: Cliques */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Métrica 3</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(metrics.clicks, 'number')}</div>
              <div className={`text-xs flex items-center ${getVariation('clicks') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getVariation('clicks') >= 0 ? '+' : ''}{getVariation('clicks')}% vs mês passado
              </div>
              <CardDescription className="text-xs mt-2">Cliques nos anúncios</CardDescription>
            </CardContent>
          </Card>

          {/* Métrica 4: Número de Anúncios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Métrica 4</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalAds || 0}</div>
              <div className="text-xs text-gray-500">
                {metrics.activeAds || 0} anúncios ativos
              </div>
              <CardDescription className="text-xs mt-2">Total de anúncios</CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      {metrics && metrics.simulated && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
          <div className="flex items-center">
            <FaFacebook className="mr-2" />
            <span>
              Conecte sua conta do Facebook para ver métricas reais dos seus anúncios.
              Atualmente exibindo dados simulados.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMetrics;
