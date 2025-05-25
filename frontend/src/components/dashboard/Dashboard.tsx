import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useState, useEffect } from "react";
import { getUserProfile } from "../../lib/api"; 
import { useToast } from "../../hooks/use-toast";
import AnunciosTabsContainer from "../AnunciosTabsContainer";
import MetaAdsConnection from "../MetaAdsConnection"; // Importar o componente de conexão
import { useMetaAds } from "../../contexts/MetaAdsContext"; // Importar o hook do contexto MetaAds
import { LoaderIcon } from "lucide-react"; // Para indicador de loading

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
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [timeRange, setTimeRange] = useState("last_30_days");

  // Usar o contexto MetaAds para obter o status da conexão
  const { metaStatus, loading: loadingMetaStatus, error: errorMetaStatus, fetchMetaStatus } = useMetaAds();

  // Recalcular a condição de conexão suficiente aqui também
  const hasValidPages = Array.isArray(metaStatus.pages) && metaStatus.pages.length > 0 && metaStatus.pages.some(p => p?.id);
  const hasValidAdAccounts = Array.isArray(metaStatus.adAccounts) && metaStatus.adAccounts.length > 0 && metaStatus.adAccounts.some(a => a?.id);
  const isSufficientlyConnected = metaStatus.status === 'connected' && (hasValidPages || hasValidAdAccounts);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const profile = await getUserProfile();
        console.log("Perfil do usuário carregado:", profile);
        setUserProfile(profile);
        setMetrics(null); // Manter métricas como null por enquanto

        // Buscar status do Meta explicitamente ao carregar o dashboard
        // Isso garante que temos o status mais recente
        await fetchMetaStatus(); 

      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os dados do perfil ou status Meta.", variant: "destructive" });
      } 
    };

    fetchInitialData();

    // Lógica para tratar callback de conexão Meta
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_connect") === "success") { // Corrigido para verificar 'success'
      toast({
        title: "Sucesso!",
        description: "Sua conta Meta Ads foi conectada com sucesso.",
        variant: "default",
      });
      fetchMetaStatus(); // Recarrega status Meta após conectar
      // Limpar parâmetros da URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("meta_connect") === "error") {
       toast({
        title: "Erro na Conexão Meta",
        description: urlParams.get("message") || "Ocorreu um erro durante a conexão com o Meta.",
        variant: "destructive",
      });
       window.history.replaceState({}, document.title, window.location.pathname);
    }

  // Depender de fetchMetaStatus e toast
  }, [fetchMetaStatus, toast]); 

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Seção de Métricas (mantida como antes) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Métricas do Dashboard</CardTitle>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
            disabled={true} 
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
              {/* Cards de métricas aqui */}
            </div>
          ) : (
            <div className="text-center p-4 text-gray-500">Métricas indisponíveis no momento.</div> 
          )}
        </CardContent>
      </Card>

      {/* Seção de Criação de Anúncios OU Conexão Meta */}
      {loadingMetaStatus ? (
        // Mostrar loading enquanto verifica o status da conexão
        <Card>
          <CardHeader>
            <CardTitle>Conexão com Meta Ads</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-6">
            <LoaderIcon className="mr-2 h-5 w-5 animate-spin" />
            <span>Verificando status da conexão...</span>
          </CardContent>
        </Card>
      ) : isSufficientlyConnected ? (
        // Se conectado suficientemente, mostrar as abas de criação de anúncio
        <AnunciosTabsContainer /> 
      ) : (
        // Se não conectado suficientemente (ou erro), mostrar o componente de conexão
        <MetaAdsConnection />
      )}

    </div>
  );
}

