import { Button } from "../ui/button";
import { useState } from "react";
import { useToast } from "../../hooks/use-toast";

export default function ConnectMeta() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawUserInfo = localStorage.getItem("userInfo");
      if (!rawUserInfo) throw new Error("Usuário não autenticado.");
      
      const { token, _id: userId } = JSON.parse(rawUserInfo);
      if (!token || !userId) {
        throw new Error("Token ou ID do usuário não encontrado. Faça login novamente.");
      }

      // Consumir a URL de autenticação diretamente da API do backend com header Authorization
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://chefstudio-production.up.railway.app";
      const response = await fetch(`${baseUrl}/api/meta/auth-url`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao obter URL de autenticação: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error("URL de autenticação não retornada pelo servidor");
      }
      
      // Redirecionar para a URL fornecida pelo backend
      window.location.href = data.authUrl;
    } catch (err: any) {
      const message = err?.message || "Erro inesperado ao conectar com Meta.";
      console.error("❌ Erro ao conectar com Meta:", message);
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 sm:p-12 rounded-lg shadow-xl max-w-md w-full text-center mx-4 sm:mx-0">
        <div className="mx-auto mb-6 h-32 w-32 flex items-center justify-center bg-purple-100 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"  // Melhoria de acessibilidade
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-gray-800">Quase lá...</h2>
        <p className="text-gray-600 mb-8">
          Para criar campanhas automaticamente, conecte sua conta Meta Ads.
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 disabled:opacity-50"
        >
          {loading ? "Redirecionando..." : "Conectar Instagram / Facebook"}
        </Button>
      </div>
    </div>
  );
}
