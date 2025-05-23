import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../hooks/use-toast";

export default function MetaConnect() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const imageUrl = "/images/meta-connect.png"; // Deve estar em /public/images

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    setDebugInfo("Iniciando conexão com Meta...");
    
    try {
      const userInfo = localStorage.getItem("userInfo");
      const token = userInfo ? JSON.parse(userInfo).token : null;
      
      if (!token) {
        const errorMsg = "Token JWT não encontrado. Faça login novamente.";
        setDebugInfo(prev => prev + "\nErro: " + errorMsg);
        throw new Error(errorMsg);
      }
      
      // ✅ Limpa possíveis barras no final da base URL
      const baseUrl = (import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app").replace(/\/+$/, "");
      setDebugInfo(prev => prev + "\nBase URL: " + baseUrl);
      
      // Consumir a URL de autenticação diretamente da API do backend
      setDebugInfo(prev => prev + "\nSolicitando URL de autenticação do backend...");
      
      const response = await fetch(`${baseUrl}/api/meta/facebook/login`, {
        method: 'GET', // Explicitly set method if needed, GET is default for fetch
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorMsg = `Erro ao obter URL de autenticação: ${response.status}`;
        setDebugInfo(prev => prev + "\nErro: " + errorMsg);
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        const errorMsg = "URL de autenticação não retornada pelo servidor";
        setDebugInfo(prev => prev + "\nErro: " + errorMsg);
        throw new Error(errorMsg);
      }
      
      setDebugInfo(prev => prev + "\nURL de autenticação recebida: " + data.authUrl);
      console.log("MetaConnect: Redirecionando para autenticação Meta:", data.authUrl);
      
      // Redireciona para o Meta usando a URL fornecida pelo backend
      window.location.href = data.authUrl;
    } catch (err: any) {
      console.error("Erro ao conectar com Meta:", err);
      setError(err.message || "Erro ao conectar com Meta.");
      setDebugInfo(prev => prev + "\nErro capturado: " + (err.message || "Erro desconhecido"));
      toast({
        title: "Erro",
        description: err.message || "Erro inesperado.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 sm:p-12 space-y-6 bg-white rounded-lg shadow-xl text-center mx-4 sm:mx-0">
        <div className="flex justify-center">
          <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path d="M945.4 512q0 104-51 192t-137 148-199 80q-100 0-183-47t-138-125l-33 117q-6 24-28 30t-38-10L70 691q-18-12-18-34 0-10 8-21l184-410q10-22 33-28t39 10l117 52q21 9 28 31t-1 40q-28 100-28 118 0 19 13 31t32 12q18 0 31-12t18-30q1-3 1-4 20-61 60-105t92-69q52-26 110-26 104 0 180 69t104 177q-1 11-1 17zm-427-90q-11 35-32 62t-51 43q-30 16-64 16-43 0-78-22t-55-59q-2-4-2-6 0-16 16-27t38-11q23 0 41 14t24 36q1 3 1 4 10 27 32 44t50 17q28 0 51-16t35-44q1-2 1-4 0-16-16-27t-38-11q-23 0-41 14t-24 36q-1 3-1 4-10 27-32 44t-50 17q-28 0-51-16t-35-44q-1-2-1-4 0-16-16-27t-38-11q-48 0-87 30t-60 79q-21 49-21 103 0 81 45 151t121 108 177 38q86 0 158-39t119-106 46-159q0-70-33-131t-90-99q-57-38-124-38-54 0-102 22z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Quase lá...</h2>
        <p className="text-gray-500 leading-relaxed">
          Para criar campanhas automaticamente,<br />
          conecte sua conta Meta ADS.
        </p>
        <div className="flex justify-center my-6">
          <img 
            src={imageUrl}
            alt="Ilustração de conexão"
            className="max-w-xs rounded-lg"
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 disabled:opacity-50"
        >
          {loading ? "Conectando..." : "Conectar Instagram / Facebook"}
        </Button>
        
        {/* Informações de debug - visíveis apenas em desenvolvimento */}
        {import.meta.env.DEV && debugInfo && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md text-left">
            <h3 className="font-bold text-sm mb-2">Informações de Debug:</h3>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
