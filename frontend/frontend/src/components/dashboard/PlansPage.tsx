import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { getUserProfile, updatePlan } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";

// Define type for plan details
interface Plan {
  name: string;
  adsLimit: number;
  price: number;
  billingCycle: string;
}

// Define type for user profile data (needed for current plan)
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  plan?: Plan; // Include plan info
  // Other fields might exist but are not needed here
}

// Define available plans (same as before)
const availablePlans: Plan[] = [
  { name: 'Gratuito', adsLimit: 1, price: 0, billingCycle: 'N/A' },
  { name: '3 Anúncios', adsLimit: 3, price: 100, billingCycle: 'mensal' },
  { name: '5 Anúncios', adsLimit: 5, price: 300, billingCycle: 'mensal' },
];

const PlansPage: React.FC = () => {
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Fetch user profile (to get current plan) on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const profileData = await getUserProfile();
        setUserProfile(profileData);
      } catch (error: any) {
        console.error("Failed to fetch user profile for plans:", error);
        toast({ title: "Erro ao carregar plano atual", description: error.message || "Não foi possível buscar seus dados.", variant: "destructive" });
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [toast]);

  // Handle Plan Change
  const handlePlanChange = async (planName: string) => {
    const currentPlanName = userProfile?.plan?.name;
    if (!userProfile || currentPlanName === planName) return; // No change or no profile

    setUpdatingPlan(true);
    try {
      const response = await updatePlan({ planName });
      // Update user profile state with the new plan details
      setUserProfile(prev => prev ? { ...prev, plan: response.plan } : null);
      toast({ title: "Sucesso!", description: response.message || `Plano atualizado para ${planName}.` });
    } catch (error: any) {
      console.error("Failed to update plan:", error);
      toast({ title: "Erro ao atualizar plano", description: error.message || "Não foi possível alterar seu plano.", variant: "destructive" });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const currentPlan = userProfile?.plan;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">Planos</CardTitle>
        <CardDescription>Visualize seu plano atual e explore outras opções.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingProfile ? (
          <p>Carregando plano atual...</p>
        ) : currentPlan ? (
          <div className="p-4 border rounded-md bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-lg mb-2">Plano Atual: {currentPlan.name}</h3>
            <p className="text-sm text-gray-700">Limite de Anúncios: {currentPlan.adsLimit}</p>
            <p className="text-sm text-gray-700">Preço: R$ {currentPlan.price.toFixed(2)} / {currentPlan.billingCycle}</p>
          </div>
        ) : (
          <p className="text-red-500">Não foi possível carregar os dados do plano atual.</p>
        )}

        <div>
          <h3 className="font-semibold text-lg mb-3">Opções de Planos</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {availablePlans.map((plan) => (
              <Card key={plan.name} className={`flex flex-col justify-between p-4 border ${currentPlan?.name === plan.name ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-200 hover:shadow-md'}`}>
                <div>
                  <h4 className="font-semibold mb-1">{plan.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">Até {plan.adsLimit} anúncio(s) simultâneo(s)</p>
                  <p className="text-lg font-bold">R$ {plan.price.toFixed(2)}
                    {plan.billingCycle !== 'N/A' && <span className="text-sm font-normal text-gray-500"> / {plan.billingCycle}</span>}
                  </p>
                </div>
                <Button
                  onClick={() => handlePlanChange(plan.name)}
                  disabled={updatingPlan || currentPlan?.name === plan.name}
                  variant={currentPlan?.name === plan.name ? "secondary" : "default"}
                  size="sm"
                  className="mt-4 w-full"
                >
                  {updatingPlan && currentPlan?.name !== plan.name ? "Alterando..." : (currentPlan?.name === plan.name ? "Plano Atual" : "Selecionar Plano")}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlansPage;

