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
      // Detecta e evita duplicar /api
      const baseUrl = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
      const redirectUrl = baseUrl.includes("/api")
        ? `${baseUrl}/meta/login`
        : `${baseUrl}/api/meta/login`;

      // Redireciona para login real com Facebook
      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error("Erro ao redirecionar para login Meta:", err.message);
      setError("Erro ao iniciar conexão com o Meta Ads.");
      toast({
        title: "Erro",
        description: "Falha ao iniciar o login com o Facebook.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 sm:p-12 rounded-lg shadow-xl max-w-md w-full text-center mx-4 sm:mx-0">
        <div className="mx-auto mb-6 h-32 w-32 flex items-center justify-center bg-purple-100 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold mb-3 text-gray-800">Quase lá...</h2>
        <p className="text-gray-600 mb-8">
          Para criar campanhas automaticamente, conecte sua conta Meta ADS.
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
