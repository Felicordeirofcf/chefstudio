import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast";

export default function ConnectMeta() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregar SDK do Facebook assim que o componente for montado
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

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

      const baseUrl =
        import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
        "https://chefstudio-production.up.railway.app";

      const redirectUrl = `${baseUrl}/api/meta/login?token=${encodeURIComponent(
        token
      )}&userId=${encodeURIComponent(userId)}`;

      window.location.href = redirectUrl;
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

  const responseFacebook = (response: any) => {
    if (response.accessToken) {
      // Aqui você pode passar o token de acesso para o seu backend
      console.log("Facebook login success:", response);

      // Redireciona o usuário para a próxima etapa
      handleConnect();
    } else {
      setError("Erro no login do Facebook.");
      toast({
        title: "Erro",
        description: "Falha no login do Facebook.",
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

        <div className="mt-6">
          {/* Facebook Login Button */}
          <FacebookLogin
            appId="719838193777692" // Substitua pelo seu App ID
            autoLoad={false}
            fields="name,email,picture"
            callback={responseFacebook}
            icon="fa-facebook"
            textButton="Conectar com Facebook"
            cssClass="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold transition duration-300"
          />
        </div>
      </div>
    </div>
  );
}
