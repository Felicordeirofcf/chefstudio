import {
  Button
} from "../ui/button";
import {
  Input
} from "../ui/input";
import {
  Label
} from "../ui/label";
import {
  Slider
} from "../ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import {
  useState,
  useEffect
} from 'react';
import {
  createAdCampaign,
  getMenuItems, // Keep for product images simulation
  // getUserProfile, // Keep for header display
  // logoutUser
} from "../../lib/api";
import {
  useToast
} from "../../hooks/use-toast";

import InteractiveMap from "./InteractiveMap"; // Import the actual map component

// Placeholder for Product Image Card
const ProductImageCard = ({ imageUrl, name }: { imageUrl: string, name: string }) => (
  <Card className="overflow-hidden">
    <img src={imageUrl || '/placeholder-image.svg'} alt={name || 'Produto'} className="w-full h-32 object-cover" />
    {/* Add toggle or other controls if needed later */}
  </Card>
);

// Define type for menu items (products)
interface MenuItem {
  id: number | string;
  name: string;
  imageUrl: string; // Changed from img to imageUrl to match API simulation
}

// Define type for user profile data (simplified for header)
// interface UserHeaderProfile {
//   name?: string;
// }

// Global variable for radius (accessible by MapPlaceholder)
// let radius = 5; // Default radius

export default function Dashboard() {
  // const navigate = useNavigate();
  const { toast } = useToast();

  // Campaign state
  const [localRadius, setLocalRadius] = useState(5); // Local state for slider
  const [budget, setBudget] = useState(70); // Default budget from image
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);

  // Menu (Products) state
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // User Profile State (Simplified for header)
  // const [userProfile, setUserProfile] = useState<UserHeaderProfile | null>(null);
  // const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetch user profile (for header) and menu items (products) on mount
  useEffect(() => {
    const fetchData = async () => {
      // setLoadingProfile(true);
      try {
        // const profileData = await getUserProfile();
        // setUserProfile(profileData);
      } catch (error: any) {
        console.error("Failed to fetch user profile for header:", error);
        // Don't block dashboard for header info error
      } finally {
        // setLoadingProfile(false);
      }

      setLoadingProducts(true);
      try {
        // Using getMenuItems to simulate fetching product images
        const items = await getMenuItems();
        // Limit to 4 items as per the mockup
        setProducts(items.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch product items (simulated):", error);
        // Set placeholder images if fetch fails
        setProducts([
          { id: 'ph1', name: 'Placeholder 1', imageUrl: '/placeholder-burger1.jpg' },
          { id: 'ph2', name: 'Placeholder 2', imageUrl: '/placeholder-burger2.jpg' },
          { id: 'ph3', name: 'Placeholder 3', imageUrl: '/placeholder-burger3.jpg' },
          { id: 'ph4', name: 'Placeholder 4', imageUrl: '/placeholder-burger4.jpg' },
        ]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchData();
  }, []);

  // Update global radius when local slider changes
  useEffect(() => {
    // radius = localRadius;
  }, [localRadius]);

  // Handle Logout is now in DashboardLayout.tsx

  // Handle campaign creation (Simulated)
  const handleCreateCampaign = async () => {
    setCreatingCampaign(true);
    setCampaignMessage(null);
    try {
      const campaignConfig = { budget, radius: localRadius }; // Use localRadius
      const response = await createAdCampaign(campaignConfig);
      console.log("Campaign created (simulated):", response);
      setCampaignMessage(response.message || "Campanha criada com sucesso!");
      toast({ title: "Sucesso!", description: response.message || "Campanha inteligente criada (simulado)." });
      setTimeout(() => setCampaignMessage(null), 5000);
    } catch (error: any) {
      console.error("Failed to create campaign (simulated):", error);
      const errorMsg = error.message || "Falha ao criar campanha.";
      setCampaignMessage(errorMsg);
      toast({ title: "Erro", description: errorMsg, variant: "destructive" });
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Simulate estimated results based on budget (as per image)
  const estimatedReachMin = 5000;
  const estimatedReachMax = 7500;
  const estimatedClicksMin = 350;
  const estimatedClicksMax = 450;
  const estimatedRevenueMin = 800;
  const estimatedRevenueMax = 1600;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Top Row: Metrics Placeholders (as per image) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métrica 1</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">1,234</div><p className="text-xs text-muted-foreground">+10% vs mês passado</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métrica 2</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ 567</div><p className="text-xs text-muted-foreground">+5% vs mês passado</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métrica 3</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">89</div><p className="text-xs text-muted-foreground">-2% vs mês passado</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métrica 4</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">9.8</div><p className="text-xs text-muted-foreground">+1% vs mês passado</p></CardContent>
        </Card>
      </div>

      {/* Main Configuration Section (as per image) */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Configurações da Campanha</CardTitle>
          {/* <CardDescription>Ajuste o raio e orçamento para sua campanha.</CardDescription> */}
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
          {/* Left Side: Map and Slider */}
          <div>
            {/* MAP COMPONENT */}
            <InteractiveMap radiusKm={localRadius} />
            <Label htmlFor="radius-slider">Raio de Alcance ({localRadius} Km)</Label>
            <Slider
              id="radius-slider"
              min={1}
              max={50} // Adjust max radius as needed
              step={1}
              value={[localRadius]}
              onValueChange={(value) => setLocalRadius(value[0])}
              className="mt-2"
            />
          </div>

          {/* Right Side: Budget and Estimates */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-input">Orçamento semanal (R$)</Label>
              <Input
                id="budget-input"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min="10" // Set a minimum budget
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Para melhores resultados recomendamos um orçamento mínimo semanal de R$70.</p>
            </div>
            <div className="text-sm space-y-1 text-gray-700">
              <p><strong>Alcance:</strong> {estimatedReachMin.toLocaleString("pt-BR")} - {estimatedReachMax.toLocaleString("pt-BR")} pessoas</p>
              <p><strong>Cliques:</strong> {estimatedClicksMin} - {estimatedClicksMax}</p>
              <p><strong>Receita:</strong> R$ {estimatedRevenueMin.toFixed(2)} - R$ {estimatedRevenueMax.toFixed(2)} / semana</p>
            </div>
            <Button
              onClick={handleCreateCampaign}
              disabled={creatingCampaign}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {creatingCampaign ? "Criando..." : "Criar campanha inteligente"}
            </Button>
            {campaignMessage && <p className={`mt-2 text-sm ${campaignMessage.includes("Falha") ? 'text-red-500' : 'text-green-600'}`}>{campaignMessage}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Product Images Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Produtos Anunciados</CardTitle>
          <CardDescription>Visualize os produtos que serão incluídos nos anúncios.</CardDescription>
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
            <p>Nenhum produto encontrado.</p>
          )}
          {/* Add button to add more products if needed */}
          {/* <Button variant="outline" className="mt-4">+ Adicionar página</Button> */}
        </CardContent>
      </Card>

    </div>
  );
}

