import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useState, useEffect } from "react";
import { getUserProfile, getMetaMetrics } from "../../lib/api"; // Adicionado getMetaMetrics
import { useToast } from "../../hooks/use-toast";
import AnunciosTabsContainer from "../AnunciosTabsContainer"; // <<< IMPORTAR O CONTAINER DE ABAS

// Define type for menu items (products) - Removido, não usado aqui
// interface MenuItem {
//   id: number | string;
//   name: string;
//   imageUrl: string;
// }

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  metaUserId?: string;
  metaAdAccountId?: string;
  metaConnectionStatus?: string;
  plan?: string | null;
}

interface MetricsData {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [timeRange, setTimeRange] = useState("last_30_days"); // Estado para o período

  // Fetch user profile and metrics on mount or timeRange change
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingMetrics(true);
      try {
        // Buscar perfil do usuário
        const profile = await getUserProfile();
        console.log("Perfil do usuário carregado:", profile);
        setUserProfile(profile);

        // Buscar métricas
        const metricsData = await getMetaMetrics(timeRange);
        setMetrics(metricsData);

      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os dados do perfil ou métricas.", variant: "destructive" });
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchInitialData();

    // Lógica para tratar conexão Meta (pode ser mantida se necessário)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_connected") === "true") {
      toast({
        title: "Sucesso!",
        description: "Sua conta Meta Ads foi conectada com sucesso.",
        variant: "default",
      });
      fetchInitialData(); // Recarrega dados após conectar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, timeRange]); // Adiciona timeRange como dependência

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Seção de Métricas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Métricas do Dashboard</CardTitle>
          {/* Seletor de Período (Exemplo básico) */}
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
            disabled={loadingMetrics}
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="last_7_days">Últimos 7 dias</option>
            <option value="last_30_days">Últimos 30 dias</option>
            <option value="this_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
          </select>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <div className="text-center p-4">Carregando métricas...</div>
          ) : metrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Impressões</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.impressions.toLocaleString("pt-BR")}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cliques</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.clicks.toLocaleString("pt-BR")}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Valor Gasto</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrency(metrics.spend)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Taxa de Cliques (CTR)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.ctr.toFixed(2)}%</div></CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center p-4 text-red-500">Não foi possível carregar as métricas.</div>
          )}
        </CardContent>
      </Card>

      {/* Seção de Criação de Anúncios com Abas */}
      <AnunciosTabsContainer /> 
      {/* <<< RENDERIZA O CONTAINER DE ABAS DIRETAMENTE AQUI */}

    </div>
  );
}

