import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const DashboardMetrics = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [granularity, setGranularity] = useState('daily');
  const [selectedMetrics, setSelectedMetrics] = useState(['impressions', 'clicks', 'spend']);
  const [userSettings, setUserSettings] = useState(null);
  const { toast } = useToast();

  // Carregar configurações do usuário
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.data.dashboardSettings) {
          setUserSettings(response.data.dashboardSettings);
          setTimeRange(response.data.dashboardSettings.defaultTimeRange || 'last_30_days');
          setSelectedMetrics(response.data.dashboardSettings.favoriteMetrics || ['impressions', 'clicks', 'spend']);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações do usuário:', error);
      }
    };

    loadUserSettings();
  }, []);

  // Carregar métricas
  useEffect(() => {
    fetchMetrics();
  }, [timeRange, granularity]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get(`/ads/metrics?timeRange=${timeRange}&granularity=${granularity}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMetrics(response.data);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      
      toast({
        title: 'Erro ao carregar métricas',
        description: error.response?.data?.message || 'Não foi possível carregar as métricas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveUserSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await api.post('/user/dashboard-settings', {
        favoriteMetrics: selectedMetrics,
        defaultTimeRange: timeRange
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências de dashboard foram salvas com sucesso.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      
      toast({
        title: 'Erro ao salvar configurações',
        description: error.response?.data?.message || 'Não foi possível salvar suas preferências.',
        variant: 'destructive'
      });
    }
  };

  const handleMetricToggle = (metric) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatMetricValue = (metric, value) => {
    if (metric === 'spend') return formatCurrency(value);
    if (metric === 'ctr') return formatPercentage(value);
    if (['impressions', 'clicks', 'reach'].includes(metric)) return value.toLocaleString();
    if (metric === 'cpc') return formatCurrency(value);
    return value;
  };

  const getMetricLabel = (metric) => {
    const labels = {
      impressions: 'Impressões',
      clicks: 'Cliques',
      spend: 'Gastos',
      reach: 'Alcance',
      ctr: 'Taxa de Cliques',
      cpc: 'Custo por Clique'
    };
    return labels[metric] || metric;
  };

  const renderMetricCards = () => {
    if (!metrics.length) return <p>Nenhum dado disponível para o período selecionado.</p>;

    // Calcular totais
    const totals = metrics.reduce((acc, day) => {
      selectedMetrics.forEach(metric => {
        acc[metric] = (acc[metric] || 0) + parseFloat(day[metric] || 0);
      });
      return acc;
    }, {});

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {selectedMetrics.map(metric => (
          <Card key={metric}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{getMetricLabel(metric)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(metric, totals[metric])}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if (!metrics.length) return <p>Nenhum dado disponível para o período selecionado.</p>;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={metrics}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date_start" />
          <YAxis />
          <Tooltip />
          {selectedMetrics.map((metric, index) => (
            <Bar 
              key={metric}
              dataKey={metric}
              fill={`hsl(${index * 40}, 70%, 50%)`}
              name={getMetricLabel(metric)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard de Métricas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="w-full md:w-1/3">
            <Label htmlFor="time-range">Período</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger id="time-range">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/3">
            <Label htmlFor="granularity">Granularidade</Label>
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger id="granularity">
                <SelectValue placeholder="Selecione a granularidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/3 self-end">
            <Button 
              onClick={fetchMetrics} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Carregando...' : 'Atualizar Dados'}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {renderMetricCards()}
          </TabsContent>
          
          <TabsContent value="chart">
            {renderChart()}
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Métricas Favoritas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {['impressions', 'clicks', 'spend', 'reach', 'ctr', 'cpc'].map(metric => (
                  <div key={metric} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`metric-${metric}`} 
                      checked={selectedMetrics.includes(metric)}
                      onCheckedChange={() => handleMetricToggle(metric)}
                    />
                    <Label htmlFor={`metric-${metric}`}>{getMetricLabel(metric)}</Label>
                  </div>
                ))}
              </div>
              
              <h3 className="text-lg font-medium mt-6">Período Padrão</h3>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                  <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={saveUserSettings} className="mt-4">
                Salvar Configurações
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DashboardMetrics;
