import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useState, useEffect } from "react";
// Corrigido: Remover importação de getMetaMetrics que não existe em api.ts
import { getUserProfile } from "../../lib/api"; 
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

// Interface para métricas (mantida, mas dados não serão buscados por enquanto)
interface MetricsData {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Manter estado de métricas, mas inicializar como null e não tentar buscar por enquanto
  const [metrics, setMetrics] = useState<MetricsData | null>(null); 
  const [loadingMetrics, setLoadingMetrics] = useState(false); // Iniciar como false, pois não vamos buscar métricas agora
  const [timeRange, setTimeRange] = useState("last_30_days"); // Estado para o período

  // Fetch user profile (REMOVIDO FETCH DE MÉTRICAS TEMPORARIAMENTE)
  use  useEffect(() => {
    const fetchInitialData = async () => {
      // setLoadingMetrics(true); // Não precisamos mais disso por enquanto
      try {
        // Buscar perfil do usuário
        const profile = await getUserProfile();
        console.log("Perfil do usuário carregado:", profile);
        setUserProfile(profile);

        // REMOVIDO: Tentativa de buscar métricas com função inexistente
        // const metricsData = await getMetaMetrics(timeRange);
        // setMetrics(metricsData);

        // Definir métricas como null ou um objeto vazio/padrão para evitar erros de renderização
        setMetrics(null); // Ou um objeto com valores padrão se preferir

      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // <<< CORRIGIDO: Adicionar verificação typeof antes de chamar toast >>>
        if (typeof toast === "function") {
          toast({ title: "Erro", description: "Não foi possível carregar os dados do perfil.", variant: "destructive" });
        } else {
          console.error("Erro ao carregar dados, mas a função toast não está disponível.");
        }
      } finally {
        // setLoadingMetrics(false); // Não precisamos mais disso por enquanto
      }
    };

    fetchInitialData();

    // Lógica para tratar conexão Meta (pode ser mantida se necessário)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_connected") === "true") {
      // <<< CORRIGIDO: Adicionar verificação typeof antes de chamar toast >>>
      if (typeof toast === "function") {
        toast({
          title: "Sucesso!",
          description: "Sua conta Meta Ads foi conectada com sucesso.",
          variant: "default",
        });
      } else {
        console.log("Conta Meta conectada com sucesso, mas a função toast não está disponível.");
      }
      fetchInitialData(); // Recarrega dados após conectar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  // Remover timeRange das dependências se não for mais usado para buscar métricas
  }, [toast]);]); 

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
          {/* Seletor de Período (Manter desabilitado ou remover se métricas não funcionam) */}
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
            disabled={true} // Desabilitar enquanto métricas não funcionam
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
          {/* Ajustar exibição de métricas, já que não estão sendo carregadas */}
          {loadingMetrics ? (
            <div className="text-center p-4">Carregando...</div> // Mensagem genérica
          ) : metrics ? (
            // Este bloco provavelmente não será renderizado, pois metrics é null
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Impressões</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{metrics.impressions.toLocaleString("pt-BR")}</div></CardContent>
              </Card>
              {/* ... outros cards de métricas ... */}
            </div>
          ) : (
            // Exibir mensagem indicando que métricas não estão disponíveis
            <div className="text-center p-4 text-gray-500">Métricas indisponíveis no momento.</div> 
          )}
        </CardContent>
      </Card>

      {/* REMOVIDO: Teste de renderização */}
      {/* 
      <h1 style={{ color: 'red', fontSize: '2rem', border: '3px dashed green', padding: '10px', textAlign: 'center', margin: '20px 0' }}>
        SE ESTE TEXTO APARECER, O ARQUIVO Dashboard.tsx ESTÁ SENDO CARREGADO.
      </h1>
      */}

      {/* Seção de Criação de Anúncios com Abas (Versão funcional) */}
      <AnunciosTabsContainer /> 
      {/* <<< RENDERIZA O CONTAINER DE ABAS DIRETAMENTE AQUI */}

    </div>
  );
}

