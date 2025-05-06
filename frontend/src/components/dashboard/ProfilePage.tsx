import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getUserProfile, updateUserProfile } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";

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
  // Plan info is handled in PlansPage
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

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileData = await getUserProfile();
        setUserProfile(profileData);
        setProfileFormData({
          name: profileData.name || '', email: profileData.email || '',
          establishmentName: profileData.establishmentName || '', businessType: profileData.businessType || '',
          whatsapp: profileData.whatsapp || '', menuLink: profileData.menuLink || '',
          address: profileData.address || '', cep: profileData.cep || '',
        });
      } catch (error: any) {
        console.error("Failed to fetch user profile:", error);
        toast({ title: "Erro ao carregar perfil", description: error.message || "Não foi possível buscar seus dados.", variant: "destructive" });
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [toast]);

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
      // Remove fields that shouldn't be sent or are empty if needed

      const updatedProfile = await updateUserProfile(dataToSend);
      setUserProfile(updatedProfile); // Update displayed profile
      // Update form data to reflect saved state (important if backend modifies data)
      setProfileFormData({
        name: updatedProfile.name || '', email: updatedProfile.email || '',
        establishmentName: updatedProfile.establishmentName || '', businessType: updatedProfile.businessType || '',
        whatsapp: updatedProfile.whatsapp || '', menuLink: updatedProfile.menuLink || '',
        address: updatedProfile.address || '', cep: updatedProfile.cep || '',
      });
      setIsEditingProfile(false);
      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      setProfileError(error.message || "Não foi possível salvar as alterações.");
      toast({ title: "Erro ao salvar", description: error.message || "Não foi possível salvar as alterações.", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-xl sm:text-2xl">Meu Perfil</CardTitle>
          <CardDescription>Gerencie suas informações pessoais e do estabelecimento.</CardDescription>
        </div>
        {!isEditingProfile && !loadingProfile && (
          <Button variant="outline" onClick={() => setIsEditingProfile(true)}>Editar Perfil</Button>
        )}
      </CardHeader>
      <CardContent>
        {loadingProfile ? (
          <p>Carregando perfil...</p>
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
                  setProfileFormData({ name: userProfile.name || '', email: userProfile.email || '', establishmentName: userProfile.establishmentName || '', businessType: userProfile.businessType || '', whatsapp: userProfile.whatsapp || '', menuLink: userProfile.menuLink || '', address: userProfile.address || '', cep: userProfile.cep || '' });
                }}>Cancelar</Button>
                <Button type="submit" disabled={profileLoading}>{profileLoading ? "Salvando..." : "Salvar Alterações"}</Button>
              </div>
            </form>
          ) : (
            // DISPLAY PROFILE
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
          )
        ) : (
          <p className="text-red-500">Não foi possível carregar os dados do perfil.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfilePage;

