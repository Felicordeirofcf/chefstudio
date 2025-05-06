import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
// import { connectMeta } from "@/lib/api"; // Import the real API function - REMOVED FOR FULL SIMULATION
import { useToast } from "../../hooks/use-toast";

export default function ConnectMeta() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder image URL - replace with actual image if available
  // const imageUrl = "/meta_connect_placeholder.png"; // TODO: Add a relevant image to public folder

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      // --- Full Frontend Simulation --- 
      console.log("Simulating Meta connection directly in frontend...");
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
      
      // Simulate updating localStorage (important for protected routes)
      const currentUserInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
      currentUserInfo.isMetaConnected = true; 
      localStorage.setItem("userInfo", JSON.stringify(currentUserInfo));
      console.log("Simulated Meta connection successful. Updated localStorage.");
      // --- End Simulation ---

      toast({
        title: "Sucesso! (Simulado)",
        description: "Conta Meta conectada com sucesso (simulado).",
      });
      navigate("/dashboard"); // Redirect to dashboard on success
    } catch (err: any) { // Keep catch block for potential simulation errors
      console.error("Simulated Meta connection failed:", err.message);
      setError(err.message || "Falha ao simular conexão Meta.");
      toast({
        title: "Erro (Simulado)",
        description: err.message || "Falha ao simular conexão Meta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 sm:p-12 rounded-lg shadow-xl max-w-md w-full text-center mx-4 sm:mx-0">
        {/* Optional Image - Add a relevant image here */}
        {/* <img src={imageUrl} alt="Conectar Meta" className="mx-auto mb-6 h-32" /> */}
        <div className="mx-auto mb-6 h-32 w-32 flex items-center justify-center bg-purple-100 rounded-full">
          {/* Placeholder Icon - Consider using Lucide icons */}
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
          {loading ? "Conectando... (Simulado)" : "Conectar Instagram / Facebook (Simulado)"}
        </Button>

        <p className="mt-4 text-xs text-gray-500">
          (Esta etapa será simulada por enquanto)
        </p>
      </div>
    </div>
  );
}

