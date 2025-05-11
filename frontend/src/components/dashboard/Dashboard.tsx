import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useState, useEffect, ChangeEvent } from "react";
import { createAdCampaign, getMenuItems, getUserProfile } from "../../lib/api"; // Adicionado getUserProfile
import { useToast } from "../../hooks/use-toast";
import InteractiveMap from "./InteractiveMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// Placeholder for Product Image Card
const ProductImageCard = ({ imageUrl, name }: { imageUrl: string; name: string }) => (
  <Card className="overflow-hidden">
    <img src={imageUrl || "/placeholder-image.svg"} alt={name || "Produto"} className="w-full h-32 object-cover" />
  </Card>
);

// Define type for menu items (products)
interface MenuItem {
  id: number | string;
  name: string;
  imageUrl: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  metaUserId?: string;
  metaAdAccountId?: string; // Adicionado para buscar o ID da conta de anúncios
  metaConnectionStatus?: string;
  plan?: string | null;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Estado para o perfil do usuário

  // Campaign state
  const [localRadius, setLocalRadius] = useState(5);
  const [budget, setBudget] = useState(70);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [publicationLink, setPublicationLink] = useState("");
  const [adText, setAdText] = useState("");
  const [adImageFile, setAdImageFile] = useState<File | null>(null);

  // Menu (Products) state
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // IA Ad Creation State
  const [iaAdType, setIaAdType] = useState<"link" | "image" | "pdf">("link");
  const [iaAdInput, setIaAdInput] = useState("");
  const [iaAdFile, setIaAdFile] = useState<File | null>(null);
  const [creatingIaAd, setCreatingIaAd] = useState(false);
  const [iaAdResultMessage, setIaAdResultMessage] = useState<string | null>(null);

  // Fetch user profile and menu items on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingProducts(true);
      try {
        // Buscar perfil do usuário
        const profile = await getUserProfile();
        setUserProfile(profile);
        if (profile && profile.metaAdAccountId) {
          setAdAccountId(profile.metaAdAccountId); // Preencher o Ad Account ID se disponível
        }

        // Buscar itens do menu
        const items = await getMenuItems();
        setProducts(items.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        // Fallback para produtos em caso de erro
        setProducts([
          { id: "ph1", name: "Placeholder Burger 1", imageUrl: "/placeholder-burger1.jpg" },
          { id: "ph2", name: "Placeholder Pizza 2", imageUrl: "/placeholder-pizza2.jpg" },
          { id: "ph3", name: "Placeholder Sushi 3", imageUrl: "/placeholder-sushi3.jpg" },
          { id: "ph4", name: "Placeholder Sobremesa 4", imageUrl: "/placeholder-sobremesa4.jpg" },
        ]);
        toast({ title: "Erro", description: "Não foi possível carregar os dados do perfil ou cardápio.", variant: "destructive" });
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchInitialData();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("meta_connected") === "true") {
      toast({
        title: "Sucesso!",
        description: "Sua conta Meta Ads foi conectada com sucesso.",
        variant: "default",
      });
      // Forçar recarregamento dos dados do perfil para obter o adAccountId
      fetchInitialData(); 
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleManualAdImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAdImageFile(event.target.files[0]);
    }
  };

  const handleCreateManualCampaign = async () => {
    if (!adAccountId || !campaignName) {
      toast({
        title: "Campos Obrigatórios",
        description: "Por favor, preencha o Nome da Campanha e o ID da Conta de Anúncios.",
        variant: "destructive",
      });
      setCampaignMessage("Nome da Campanha e ID da Conta de Anúncios são obrigatórios.");
      return;
    }

    setCreatingCampaign(true);
    setCampaignMessage(null);
    try {
      const campaignConfig = {
        adAccountId,
        name: campaignName,
        objective: "LINK_CLICKS",
        status: "PAUSED",
        budgetValue: budget,
        radiusValue: localRadius,
        publicationLinkValue: publicationLink,
        adTextValue: adText,
      };

      const response = await createAdCampaign(campaignConfig);
      setCampaignMessage(response.message || "Campanha manual criada com sucesso!");
      toast({ title: "Sucesso!", description: response.message || "Campanha manual criada com sucesso!" });
      setTimeout(() => setCampaignMessage(null), 5000);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || "Falha ao criar campanha manual.";
      setCampaignMessage(errorMsg);
      toast({ title: "Erro", description: errorMsg, variant: "destructive" });
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleCreateIaAd = async () => {
    setCreatingIaAd(true);
    setIaAdResultMessage("Processando com IA...");
    await new Promise(resolve => setTimeout(resolve, 2500));
    let simulatedAdText = "Anúncio incrível gerado por IA!";
    if (iaAdType === "link" && iaAdInput) {
      simulatedAdText = `Anúncio para o cardápio em ${iaAdInput}: Experimente nossas delícias!`;
    } else if (iaAdFile) {
      simulatedAdText = `Anúncio baseado no arquivo ${iaAdFile.name}: Ofertas especiais hoje!`;
    }
    setIaAdResultMessage(`Simulação de Anúncio Gerado: "${simulatedAdText}" (Este é um resultado simulado)`);
    toast({ title: "IA Concluído (Simulado)", description: "Conteúdo do anúncio simulado gerado." });
    setCreatingIaAd(false);
  };

  const handleIaFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIaAdFile(event.target.files[0]);
    }
  };

  const estimatedReachMin = 5000;
  const estimatedReachMax = 7500;
  const estimatedClicksMin = 350;
  const estimatedClicksMax = 450;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm font-medium">Métrica 1</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">1,234</div><p className="text-xs text-muted-foreground">+10% vs mês passado</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium">Métrica 2</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ 567</div><p className="text-xs text-muted-foreground">+5% vs mês passado</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium">Métrica 3</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">89</div><p className="text-xs text-muted-foreground">-2% vs mês passado</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-medium">Métrica 4</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">9.8</div><p className="text-xs text-muted-foreground">+1% vs mês passado</p></CardContent></Card>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Criar Anúncio Manualmente</TabsTrigger>
          <TabsTrigger value="ia">Criar Anúncio com IA (Simulado)</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Configurações da Campanha Manual</CardTitle>
              <CardDescription>Defina os parâmetros para sua campanha de anúncios no Meta Ads.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div>
                <InteractiveMap radiusKm={localRadius} />
                <Label htmlFor="radius-slider-manual">Raio de Alcance ({localRadius} Km)</Label>
                <Slider id="radius-slider-manual" min={1} max={50} step={1} value={[localRadius]} onValueChange={(value) => setLocalRadius(value[0])} className="mt-2" />
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Nome da Campanha *</Label>
                  <Input id="campaign-name" placeholder="Ex: Campanha de Verão" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ad-account-id">ID da Conta de Anúncios (act_xxxxxxxxxx) *</Label>
                  <Input 
                    id="ad-account-id" 
                    placeholder="Conecte ao Meta Ads para carregar ou insira manualmente"
                    value={adAccountId} 
                    onChange={(e) => setAdAccountId(e.target.value)} 
                    className="mt-1" 
                    readOnly={!!(userProfile && userProfile.metaAdAccountId)} // Torna readOnly se veio do perfil
                  />
                  {!(userProfile && userProfile.metaAdAccountId) && 
                    <p className="text-xs text-gray-500 mt-1">Você encontra o ID da sua conta de anúncios no Gerenciador de Anúncios do Facebook ou conecte sua conta Meta.</p>
                  }
                  {(userProfile && userProfile.metaAdAccountId) && 
                    <p className="text-xs text-green-600 mt-1">ID da Conta de Anúncios carregado automaticamente.</p>
                  }
                </div>
                <div>
                  <Label htmlFor="budget-input-manual">Orçamento semanal (R$)</Label>
                  <Input id="budget-input-manual" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min="10" className="mt-1" />
                  <p className="text-xs text-gray-500 mt-1">Para melhores resultados recomendamos um orçamento mínimo semanal de R$70.</p>
                </div>
                <div>
                  <Label htmlFor="publication-link">Link da Publicação (Opcional)</Label>
                  <Input id="publication-link" type="url" placeholder="https://facebook.com/suapagina/posts/123..." value={publicationLink} onChange={(e) => setPublicationLink(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ad-creative-text">Texto do Anúncio</Label>
                  <Input id="ad-creative-text" placeholder="Ex: Promoção especial esta semana!" value={adText} onChange={(e) => setAdText(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="ad-image-upload">Imagem/Vídeo do Anúncio</Label>
                  <Input id="ad-image-upload" type="file" onChange={handleManualAdImageChange} className="mt-1" />
                  <p className="text-xs text-gray-500 mt-1">Faça upload da imagem ou vídeo para seu anúncio.</p>
                </div>
                <div className="text-sm space-y-1 text-gray-700">
                  <p><strong>Alcance Estimado:</strong> {estimatedReachMin.toLocaleString("pt-BR")} - {estimatedReachMax.toLocaleString("pt-BR")} pessoas</p>
                  <p><strong>Cliques Estimados:</strong> {estimatedClicksMin} - {estimatedClicksMax}</p>
                </div>
                <Button onClick={handleCreateManualCampaign} disabled={creatingCampaign} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {creatingCampaign ? "Criando Campanha Manual..." : "Criar Campanha Manual no Meta Ads"}
                </Button>
                {campaignMessage && <p className={`mt-2 text-sm ${campaignMessage.includes("Falha") || campaignMessage.includes("Erro") || campaignMessage.includes("obrigatórios") ? 'text-red-500' : 'text-green-600'}`}>{campaignMessage}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ia">
          <Card className="shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Criar Anúncio com Assistência de IA (Simulado)</CardTitle>
              <CardDescription>Forneça seu cardápio e deixe nossa IA (simulada) criar uma sugestão de anúncio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Como você quer fornecer seu cardápio?</Label>
                <div className="flex space-x-4 mt-2">
                  <Button variant={iaAdType === "link" ? "default" : "outline"} onClick={() => setIaAdType("link")}>Link</Button>
                  <Button variant={iaAdType === "image" ? "default" : "outline"} onClick={() => setIaAdType("image")}>Imagem</Button>
                  <Button variant={iaAdType === "pdf" ? "default" : "outline"} onClick={() => setIaAdType("pdf")}>PDF</Button>
                </div>
              </div>
              {iaAdType === "link" && (
                <div>
                  <Label htmlFor="ia-ad-link">Link do Cardápio</Label>
                  <Input id="ia-ad-link" type="url" placeholder="https://seurestaurante.com/cardapio" value={iaAdInput} onChange={(e) => setIaAdInput(e.target.value)} className="mt-1" />
                </div>
              )}
              {(iaAdType === "image" || iaAdType === "pdf") && (
                <div>
                  <Label htmlFor="ia-ad-file">Arquivo do Cardápio ({iaAdType === "image" ? "Imagem" : "PDF"})</Label>
                  <Input id="ia-ad-file" type="file" accept={iaAdType === "image" ? "image/*" : ".pdf"} onChange={handleIaFileChange} className="mt-1" />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-8 pt-4">
                 <div>
                    <Label htmlFor="radius-slider-ia">Raio de Alcance ({localRadius} Km)</Label>
                    <Slider id="radius-slider-ia" min={1} max={50} step={1} value={[localRadius]} onValueChange={(value) => setLocalRadius(value[0])} className="mt-2" />
                </div>
                <div>
                    <Label htmlFor="budget-input-ia">Orçamento semanal (R$)</Label>
                    <Input id="budget-input-ia" type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} min="10" className="mt-1" />
                </div> 
              </div>
              <Button onClick={handleCreateIaAd} disabled={creatingIaAd || (iaAdType === 'link' && !iaAdInput) || (iaAdType !== 'link' && !iaAdFile)} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                {creatingIaAd ? "Gerando com IA..." : "Gerar Anúncio com IA (Simulado)"}
              </Button>
              {iaAdResultMessage && <p className={`mt-2 text-sm ${iaAdResultMessage.includes("Processando") ? 'text-blue-500' : 'text-green-600'}`}>{iaAdResultMessage}</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Produtos Anunciados (Exemplo)</CardTitle>
           <CardDescription>Estes são exemplos de produtos que podem ser destacados em seus anúncios.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <p>Carregando produtos...</p>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((item) => (
                <ProductImageCard key={item.id} imageUrl={item.imageUrl} name={item.name} />
              ))}
            </div>
          ) : (
            <p>Nenhum produto de exemplo encontrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

