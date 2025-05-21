import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getUserProfile, updateUserProfile } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";

// Define type for user profile data
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  establishmentName?: string;
  businessType?: string;
  whatsapp?: string;
  menuLink?: string;
  address?: string;
  cep?: string;
  plan?: string;
}

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<UserProfile>>({
    name: '', email: '', establishmentName: '', businessType: '', whatsapp: '', menuLink: '', address: '', cep: '',
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Função para obter o nome do plano formatado
  const getPlanName = (planCode: string | undefined): string => {
    if (!planCode) return "Gratuito";
    
    switch(planCode) {
      case "free":
        return "Gratuito";
      case "basic":
        return "3 Anúncios (R$ 100,00/mês)";
      case "premium":
        return "5 Anúncios (R$ 300,00/mês)";
      default:
        return planCode;
    }
  };

  // Fetch user profile on component mount with retry logic
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      
      try {
        // Verificar se há token antes de fazer a requisição
        const userInfo = localStorage.getItem('userInfo');
        const token = localStorage.getItem('token');
        
        if (!userInfo && !token) {
          console.error("Token não encontrado no localStorage");
          setProfileError("Você precisa estar autenticado para acessar seu perfil. Por favor, faça login novamente.");
          setLoadingProfile(false);
          return;
        }
        
        console.log("Buscando perfil do usuário...");
        const profileData = await getUserProfile();
        console.log("Perfil carregado com sucesso:", profileData);
        
        if (!profileData || !profileData._id) {
          throw new Error("Dados do perfil inválidos ou incompletos");
        }
        
        setUserProfile(profileData);
        setProfileFormData({
          name: profileData.name || '', 
          email: profileData.email || '',
          establishmentName: profileData.establishmentName || '', 
          businessType: profileData.businessType || '',
          whatsapp: profileData.whatsapp || '', 
          menuLink: profileData.menuLink || '',
          address: profileData.address || '', 
          cep: profileData.cep || '',
        });
      } catch (error: any) {
        console.error("Failed to fetch user profile:", error);
        
        // Mensagem de erro mais amigável baseada no tipo de erro
        let errorMessage = "Não foi possível buscar seus dados.";
        
        if (error.message?.includes("Token") || error.message?.includes("autenticação") || error.message?.includes("autorizado")) {
          errorMessage = "Sessão expirada ou inválida. Por favor, faça login novamente.";
          // Limpar tokens para forçar novo login
          localStorage.removeItem('userInfo');
          localStorage.removeItem('token');
          
          // Redirecionar para login após um breve delay
          setTimeout(() => {
            window.location.href = '/login?session_expired=true';
          }, 3000);
        } else if (error.message?.includes("Usuário não encontrado")) {
          errorMessage = "Usuário não encontrado. Por favor, verifique se sua conta ainda está ativa.";
        } else if (error.message?.includes("rede") || error.message?.includes("conexão")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        }
        
        setProfileError(errorMessage);
        toast({ 
          title: "Erro ao carregar perfil", 
          description: errorMessage, 
          variant: "destructive" 
        });
        
        // Tentar novamente se for um erro de rede (até 3 tentativas)
        if (retryCount < 2 && (error.message?.includes("rede") || error.message?.includes("conexão"))) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchProfile(), 3000); // Tentar novamente após 3 segundos
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, [toast, retryCount]);

  // Handle Profile Form Input Change
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Profile Form Select Change
  const handleProfileSelectChange = (value: string) => {
    setProfileFormData(prev => ({ ...prev, businessType: value }));
  };

  // Handle Profile Form Submit
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    try {
      // Ensure required fields are present if necessary before sending
      const dataToSend = { ...profileFormData };
      console.log("Enviando dados de perfil:", dataToSend);

      const updatedProfile = await updateUserProfile(dataToSend);
      console.log("Perfil atualizado com sucesso:", updatedProfile);
      setUserProfile(updatedProfile); // Update displayed profile
      
      // Update form data to reflect saved state (important if backend modifies data)
      setProfileFormData({
        name: updatedProfile.name || '', 
        email: updatedProfile.email || '',
        establishmentName: updatedProfile.establishmentName || '', 
        businessType: updatedProfile.businessType || '',
        whatsapp: updatedProfile.whatsapp || '', 
        menuLink: updatedProfile.menuLink || '',
        address: updatedProfile.address || '', 
        cep: updatedProfile.cep || '',
      });
      setIsEditingProfile(false);
      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      
      // Mensagem de erro mais amigável
      let errorMessage = error.message || "Não foi possível salvar as alterações.";
      
      if (error.message?.includes("Token") || error.message?.includes("autenticação") || error.message?.includes("autorizado")) {
        errorMessage = "Sessão expirada. Por favor, faça login novamente para salvar seu perfil.";
        // Limpar tokens para forçar novo login
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        
        // Redirecionar para login após um breve delay
        setTimeout(() => {
          window.location.href = '/login?session_expired=true';
        }, 3000);
      }
      
      setProfileError(errorMessage);
      toast({ 
        title: "Erro ao salvar", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Função para tentar novamente
  const handleRetry = () => {
    setRetryCount(0); // Resetar contador para forçar nova tentativa
  };

  // Função para obter plano do localStorage se não estiver no perfil
  const getUserPlan = (): string => {
    if (userProfile?.plan) return userProfile.plan;
    
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsedInfo = JSON.parse(userInfo);
        return parsedInfo.plan || 'free';
      }
    } catch (error) {
      console.error("Erro ao obter plano do localStorage:", error);
    }
    
    return 'free';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-xl sm:text-2xl">Meu Perfil</CardTitle>
          <CardDescription>Gerencie suas informações pessoais e do estabelecimento.</CardDescription>
        </div>
        {!isEditingProfile && !loadingProfile && userProfile && (
          <Button variant="outline" onClick={() => setIsEditingProfile(true)}>Editar Perfil</Button>
        )}
      </CardHeader>
      <CardContent>
        {loadingProfile ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando seu perfil...</p>
          </div>
        ) : profileError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-red-500 mb-4">{profileError}</div>
            <Button onClick={handleRetry} variant="outline">Tentar Novamente</Button>
          </div>
        ) : userProfile ? (
          isEditingProfile ? (
            // EDITING FORM
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label htmlFor="profileName">Nome do Responsável</Label><Input id="profileName" name="name" value={profileFormData.name || ''} onChange={handleProfileChange} required /></div>
                <div><Label htmlFor="profileEmail">Email</Label><Input id="profileEmail" name="email" type="email" value={profileFormData.email || ''} onChange={handleProfileChange} required /></div>
                <div><Label htmlFor="profileAddress">Endereço</Label><Input id="profileAddress" name="address" value={profileFormData.address || ''} onChange={handleProfileChange} placeholder="Rua Exemplo, 123" /></div>
                <div><Label htmlFor="profileCep">CEP</Label><Input id="profileCep" name="cep" value={profileFormData.cep || ''} onChange={handleProfileChange} placeholder="12345-678" /></div>
                <div><Label htmlFor="profileEstablishmentName">Nome do Estabelecimento</Label><Input id="profileEstablishmentName" name="establishmentName" value={profileFormData.establishmentName || ''} onChange={handleProfileChange} required /></div>
                <div>
                  <Label htmlFor="profileBusinessType">Tipo de Negócio</Label>
                  <Select name="businessType" value={profileFormData.businessType || ''} onValueChange={handleProfileSelectChange}>
                    <SelectTrigger id="profileBusinessType"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Restaurante">Restaurante</SelectItem>
                      <SelectItem value="Bar">Bar</SelectItem>
                      <SelectItem value="Cafeteria">Cafeteria</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="profileWhatsapp">WhatsApp</Label><Input id="profileWhatsapp" name="whatsapp" value={profileFormData.whatsapp || ''} onChange={handleProfileChange} placeholder="(11) 99999-8888" required /></div>
                <div><Label htmlFor="profileMenuLink">Link do Cardápio (Opcional)</Label><Input id="profileMenuLink" name="menuLink" value={profileFormData.menuLink || ''} onChange={handleProfileChange} placeholder="https://seu.cardapio/online" /></div>
              </div>
              {profileError && <p className="text-red-500 text-sm mt-4">{profileError}</p>}
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditingProfile(false); setProfileError(null);
                  // Reset form data to original profile data
                  setProfileFormData({ 
                    name: userProfile.name || '', 
                    email: userProfile.email || '', 
                    establishmentName: userProfile.establishmentName || '', 
                    businessType: userProfile.businessType || '', 
                    whatsapp: userProfile.whatsapp || '', 
                    menuLink: userProfile.menuLink || '', 
                    address: userProfile.address || '', 
                    cep: userProfile.cep || '' 
                  });
                }}>Cancelar</Button>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          ) : (
            // DISPLAY PROFILE
            <div className="space-y-6">
              <div className="space-y-2 text-sm text-gray-700 grid sm:grid-cols-2 gap-x-4 gap-y-2">
                <p><strong>Nome Responsável:</strong> {userProfile.name}</p>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Endereço:</strong> {userProfile.address || "Não informado"}</p>
                <p><strong>CEP:</strong> {userProfile.cep || "Não informado"}</p>
                <p><strong>Estabelecimento:</strong> {userProfile.establishmentName || "Não informado"}</p>
                <p><strong>Tipo:</strong> {userProfile.businessType || "Não informado"}</p>
                <p><strong>WhatsApp:</strong> {userProfile.whatsapp || "Não informado"}</p>
                <p><strong>Cardápio:</strong> {userProfile.menuLink ? <a href={userProfile.menuLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{userProfile.menuLink}</a> : "Não informado"}</p>
              </div>
              
              {/* Seção de Plano Ativo */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center mb-3">
                  <CreditCard className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-lg font-medium">Plano Ativo</h3>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                  <p className="text-purple-800 font-medium">{getPlanName(getUserPlan())}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {getUserPlan() === 'free' 
                      ? 'Plano gratuito com recursos limitados.' 
                      : 'Plano pago com recursos avançados e suporte prioritário.'}
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-red-500 mb-4">Não foi possível carregar os dados do perfil.</div>
            <Button onClick={handleRetry} variant="outline">Tentar Novamente</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfilePage;
