import { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CalendarIcon, InfoIcon, LoaderIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function CreateAdFromPost() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [adDetails, setAdDetails] = useState(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaConnectionChecked, setMetaConnectionChecked] = useState(false);
  
  // Pré-preencher com a URL fornecida pelo usuário
  const [formData, setFormData] = useState({
    postUrl: "https://www.facebook.com/photo/?fbid=122102873852863870&set=a.122102873882863870",
    adName: "Promoção ChefStudio",
    dailyBudget: "70", // Ajustado para o mínimo de R$70
    startDate: new Date(),
    endDate: null,
    targetCountry: "BR",
    objective: "LINK_CLICKS" // Valor padrão para o objetivo
  });

  const countries = [
    { code: "BR", name: "Brasil" },
    { code: "US", name: "Estados Unidos" },
    { code: "AR", name: "Argentina" },
    { code: "MX", name: "México" },
    { code: "PT", name: "Portugal" },
    { code: "ES", name: "Espanha" },
    { code: "CO", name: "Colômbia" },
    { code: "CL", name: "Chile" },
    { code: "PE", name: "Peru" },
  ];

  // Opções para o objetivo da campanha
  const objectiveOptions = [
    { value: "LINK_CLICKS", label: "Cliques no link (tráfego)" },
    { value: "POST_ENGAGEMENT", label: "Engajamento em publicação" },
    { value: "LEAD_GENERATION", label: "Geração de leads" },
    { value: "OUTCOME_TRAFFIC", label: "Tráfego (novo)" },
    { value: "OUTCOME_LEADS", label: "Leads (novo)" },
    { value: "CONVERSIONS", label: "Conversões" }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const validateForm = () => {
    if (!metaConnected) {
      setError("Você precisa conectar sua conta ao Meta Ads primeiro");
      return false;
    }
    
    if (!formData.postUrl) {
      setError("URL da publicação é obrigatória");
      return false;
    }
    if (!formData.adName) {
      setError("Nome do anúncio é obrigatório");
      return false;
    }
    if (!formData.dailyBudget || isNaN(formData.dailyBudget) || parseFloat(formData.dailyBudget) < 70) {
      setError("Orçamento diário deve ser um número maior ou igual a R$70");
      return false;
    }
    if (!formData.startDate) {
      setError("Data de início é obrigatória");
      return false;
    }
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError("Data de término deve ser posterior à data de início");
      return false;
    }
    if (!formData.objective) {
      setError("Objetivo da campanha é obrigatório");
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
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      const token = parsedUserInfo?.token;
      
      if (!token) {
        throw new Error("Você precisa estar logado para criar anúncios");
      }
      
      // Verificar se o usuário está conectado ao Meta
      if (!metaConnected) {
        throw new Error("Você precisa conectar sua conta ao Meta Ads primeiro");
      }
      
      // Configurar cliente axios com o token
      const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app").replace(/\/+$/, "")}/api`;
      const api = axios.create({
        baseURL: API_BASE_URL,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Enviar solicitação para criar anúncio
      const response = await api.post("/meta-ads/create-from-post", {
        postUrl: formData.postUrl,
        adName: formData.adName,
        dailyBudget: formData.dailyBudget,
        startDate: formData.startDate,
        endDate: formData.endDate,
        targetCountry: formData.targetCountry,
        objective: formData.objective // Incluir o objetivo no payload
      });
      
      setSuccess(true);
      setAdDetails(response.data.adDetails);
      
      toast({
        title: "Anúncio criado com sucesso!",
        description: "O anúncio foi criado e está pausado para revisão.",
      });
      
      // Redirecionar para a tela de listagem de campanhas após sucesso
      setTimeout(() => {
        window.location.href = '/dashboard/campanhas';
      }, 1500);
      
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

  // Verificar status de conexão Meta ao carregar o componente
  useEffect(() => {
    const checkMetaConnection = async () => {
      try {
        const userInfo = localStorage.getItem("userInfo");
        const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
        const token = parsedUserInfo?.token;
        
        if (!token) {
          setMetaConnected(false);
          setMetaConnectionChecked(true);
          return;
        }
        
        const API_BASE_URL = `${(import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app").replace(/\/+$/, "")}/api`;
        const api = axios.create({
          baseURL: API_BASE_URL,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const response = await api.get("/meta/connection-status");
        
        // Verificar se o usuário está conectado e tem páginas/contas de anúncio
        const isFullyConnected = 
          response.data?.status === 'connected' && 
          response.data?.pages?.length > 0 && 
          response.data?.adAccounts?.length > 0;
        setMetaConnected(isFullyConnected);
        
        if (!isFullyConnected) {
          // Ajustar a mensagem de erro para ser mais específica se faltar páginas/contas
          let errorMsg = "Você precisa conectar sua conta ao Meta Ads primeiro";
          if (response.data?.status === 'connected' && (!response.data?.pages?.length || !response.data?.adAccounts?.length)) {
            errorMsg = "Sua conta Meta está conectada, mas não foram encontradas páginas ou contas de anúncio válidas.";
          }
          setError(errorMsg);
          toast({
            title: "Conexão Meta incompleta ou ausente",
            description: errorMsg,
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Erro ao verificar status de conexão Meta:", err);
        setMetaConnected(false);
        setError("Não foi possível verificar sua conexão com o Meta Ads. Por favor, tente novamente mais tarde.");
      } finally {
        setMetaConnectionChecked(true);
      }
    };
    
    checkMetaConnection();
  }, [toast]);

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar Anúncio a partir de Publicação</CardTitle>
          <CardDescription>
            Promova uma publicação existente do Facebook como anúncio
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!metaConnectionChecked ? (
            <div className="flex justify-center items-center py-8">
              <LoaderIcon className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2">Verificando conexão com Meta Ads...</span>
            </div>
          ) : !metaConnected ? (
            <Alert variant="destructive" className="mb-6">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Conexão Meta necessária</AlertTitle>
              <AlertDescription>
                Você precisa conectar sua conta ao Meta Ads antes de criar anúncios.
                <div className="mt-4">
                  <Button 
                    onClick={() => window.location.href = "/connect-meta"}
                    variant="outline"
                  >
                    Ir para página de conexão Meta
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : !success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="postUrl">URL da Publicação do Facebook</Label>
                <Input
                  id="postUrl"
                  name="postUrl"
                  placeholder="https://www.facebook.com/photo/?fbid=123456789..."
                  value={formData.postUrl}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-sm text-gray-500">
                  URL da publicação que você deseja promover
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adName">Nome do Anúncio</Label>
                <Input
                  id="adName"
                  name="adName"
                  placeholder="Promoção de Primavera"
                  value={formData.adName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {/* Novo campo de seleção de objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo da Campanha *</Label>
                <Select 
                  value={formData.objective} 
                  onValueChange={(value) => handleSelectChange("objective", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {objectiveOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dailyBudget">Orçamento Diário (R$)</Label>
                <Input
                  id="dailyBudget"
                  name="dailyBudget"
                  type="number"
                  min="70"
                  step="0.01"
                  placeholder="70.00"
                  value={formData.dailyBudget}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-sm text-gray-500">
                  Mínimo recomendado: R$70
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? (
                          format(formData.startDate, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => handleDateChange("startDate", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Data de Término (opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? (
                          format(formData.endDate, "dd/MM/yyyy")
                        ) : (
                          <span>Sem data de término</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => handleDateChange("endDate", date)}
                        initialFocus
                        disabled={(date) => date < new Date(formData.startDate)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="targetCountry">País Alvo</Label>
                <Select 
                  value={formData.targetCountry} 
                  onValueChange={(value) => handleSelectChange("targetCountry", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
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
                disabled={loading || !metaConnected}
              >
                {loading ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Criando anúncio...
                  </>
                ) : (
                  "Criar Anúncio"
                )}
              </Button>
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
                      <p className="text-sm font-medium text-gray-500">Objetivo</p>
                      <p>{adDetails.objective || formData.objective}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Data de Início</p>
                      <p>{format(new Date(adDetails.startDate || formData.startDate), "dd/MM/yyyy")}</p>
                    </div>
                    
                    {(adDetails.endDate || formData.endDate) && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Data de Término</p>
                        <p>{format(new Date(adDetails.endDate || formData.endDate), "dd/MM/yyyy")}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6">
                    <Button 
                      onClick={() => window.location.href = '/dashboard/campanhas'}
                      className="w-full"
                    >
                      Ver Todas as Campanhas
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
