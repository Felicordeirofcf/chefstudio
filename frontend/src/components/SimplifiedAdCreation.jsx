import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { InfoIcon, LoaderIcon, ImageIcon, LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export default function SimplifiedAdCreation() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [adDetails, setAdDetails] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("image");
  
  // Estados simplificados para o formulário
  const [formData, setFormData] = useState({
    postUrl: "",
    image: null,
    imagePreview: null
  });

  // Verificar status de conexão Meta e perfil do usuário ao carregar o componente
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userInfo = localStorage.getItem("userInfo");
        const token = userInfo ? JSON.parse(userInfo).token : null;
        
        if (!token) return;
        
        const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app").replace(/\/+$/, "")}/api`;
        const api = axios.create({
          baseURL: API_BASE_URL,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Verificar status de conexão Meta
        const connectionResponse = await api.get("/api/meta/connection-status");
        
        if (!connectionResponse.data.connected) {
          toast({
            title: "Conexão Meta necessária",
            description: "Você precisa conectar sua conta Meta para criar anúncios.",
            variant: "destructive",
          });
          return;
        }
        
        // Buscar perfil do usuário com informações do restaurante
        const profileResponse = await api.get("/api/profile");
        setUserProfile(profileResponse.data);
        
      } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
      }
    };
    
    fetchUserData();
  }, [toast]);

  const handlePostUrlChange = (e) => {
    setFormData(prev => ({ ...prev, postUrl: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Atualizar estado com a imagem selecionada
      setFormData(prev => ({ 
        ...prev, 
        image: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const validateForm = () => {
    if (activeTab === "link" && !formData.postUrl) {
      setError("URL da publicação é obrigatória");
      return false;
    }
    
    if (activeTab === "image" && !formData.image) {
      setError("Selecione uma imagem para o anúncio");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setAdDetails(null);
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Obter token do localStorage
      const userInfo = localStorage.getItem("userInfo");
      const token = userInfo ? JSON.parse(userInfo).token : null;
      
      if (!token) {
        throw new Error("Você precisa estar logado para criar anúncios");
      }
      
      // Configurar cliente axios com o token
      const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app").replace(/\/+$/, "")}/api`;
      const api = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      let response;
      
      if (activeTab === "link") {
        // Criar anúncio a partir de URL de publicação
        response = await api.post("/api/meta/create-ad-from-post", {
          postUrl: formData.postUrl,
          // Valores padrão otimizados
          adName: `Anúncio ${userProfile?.restaurantName || 'Restaurante'} ${new Date().toLocaleDateString('pt-BR')}`,
          dailyBudget: "50",
          startDate: new Date(),
          endDate: null,
          targetCountry: "BR"
        });
      } else {
        // Criar anúncio a partir de imagem
        const formDataObj = new FormData();
        formDataObj.append('image', formData.image);
        formDataObj.append('adName', `Anúncio ${userProfile?.restaurantName || 'Restaurante'} ${new Date().toLocaleDateString('pt-BR')}`);
        formDataObj.append('dailyBudget', "50");
        formDataObj.append('startDate', new Date().toISOString());
        formDataObj.append('targetCountry', "BR");
        
        response = await api.post("/api/meta/create-ad-from-image", formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      setSuccess(true);
      setAdDetails(response.data.adDetails);
      
      toast({
        title: "Anúncio criado com sucesso!",
        description: "O anúncio foi criado e está pausado para revisão.",
      });
      
      // Limpar formulário
      setFormData({
        postUrl: "",
        image: null,
        imagePreview: null
      });
      
    } catch (err) {
      console.error("Erro ao criar anúncio:", err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || "Erro ao criar anúncio. Tente novamente.");
      }
      
      toast({
        title: "Erro ao criar anúncio",
        description: err.response?.data?.message || err.message || "Ocorreu um erro ao criar o anúncio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar Anúncio Simplificado</CardTitle>
          <CardDescription>
            Crie anúncios no Meta Ads de forma rápida e simples
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="image" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">Usar Imagem</TabsTrigger>
                  <TabsTrigger value="link">Usar Link do Facebook</TabsTrigger>
                </TabsList>
                
                <TabsContent value="image" className="space-y-4 pt-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {formData.imagePreview ? (
                      <div className="space-y-4">
                        <img 
                          src={formData.imagePreview} 
                          alt="Preview" 
                          className="max-h-[300px] mx-auto rounded-md" 
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: null }))}
                        >
                          Remover Imagem
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            Arraste e solte uma imagem ou clique para selecionar
                          </p>
                          <Button variant="outline" className="relative">
                            Selecionar Imagem
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>A imagem será usada para criar um anúncio otimizado automaticamente.</p>
                    <p>Recomendamos imagens de alta qualidade do seu cardápio ou produtos.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="postUrl">URL da Publicação do Facebook</Label>
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-5 w-5 text-gray-400" />
                      <Input
                        id="postUrl"
                        name="postUrl"
                        placeholder="https://www.facebook.com/photo/?fbid=123456789..."
                        value={formData.postUrl}
                        onChange={handlePostUrlChange}
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Cole a URL completa de uma publicação existente do Facebook
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              {error && (
                <Alert variant="destructive">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Criando anúncio...
                  </>
                ) : (
                  "Criar Anúncio no Meta Ads"
                )}
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                Seu anúncio será criado com configurações otimizadas automaticamente
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-200">
                <InfoIcon className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Anúncio criado com sucesso!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Seu anúncio foi criado e está pausado para revisão.
                </AlertDescription>
              </Alert>
              
              {adDetails && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-medium">Detalhes do Anúncio</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Nome do Anúncio</p>
                      <p>{adDetails.name}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pausado
                        </span>
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Orçamento Diário</p>
                      <p>R$ {adDetails.dailyBudget.toFixed(2)}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">País Alvo</p>
                      <p>Brasil</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-4">
                    <p className="text-sm font-medium text-gray-500">IDs do Facebook</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Campanha:</span> {adDetails.campaignId}
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Conjunto:</span> {adDetails.adSetId}
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <span className="font-medium">Anúncio:</span> {adDetails.adId}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSuccess(false);
                    setAdDetails(null);
                    setFormData({
                      postUrl: "",
                      image: null,
                      imagePreview: null
                    });
                  }}
                >
                  Criar Novo Anúncio
                </Button>
                
                <Button 
                  className="flex-1"
                  onClick={() => {
                    window.open("https://business.facebook.com/adsmanager", "_blank");
                  }}
                >
                  Ver no Gerenciador de Anúncios
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
