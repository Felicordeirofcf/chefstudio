import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState, useEffect } from "react";
import { getUserProfile } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import AnunciosTabsContainer from "../AnunciosTabsContainer";

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

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const profile = await getUserProfile();
        console.log("Perfil do usuário carregado:", profile);
        setUserProfile(profile);
        setMetrics(null);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        if (typeof toast === "function") {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do perfil.",
            variant: "destructive",
          });
        }
      }
    };

    fetchInitialData();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_connected") === "true") {
      if (typeof toast === "function") {
        toast({
          title: "Sucesso!",
          description: "Sua conta Meta Ads foi conectada com sucesso.",
          variant: "default",
        });
      }
      fetchInitialData();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Seção de Métricas */}
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
            <div className="text-center p-4">Carregando...</div>
          ) : metrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.impressions.toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
              {/* Outros cards de métricas poderiam ir aqui */}
            </div>
          ) : (
            <div className="text-center p-4 text-gray-500">
              Métricas indisponíveis no momento.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Container de Anúncios */}
      <AnunciosTabsContainer />
    </div>
  );
}
