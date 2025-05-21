import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";

export default function MetaCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("MetaCallback: Iniciando processamento do callback");
        setDebugInfo(prev => prev + "\nIniciando processamento do callback");
        
        // Extrair parâmetros da URL
        const params = new URLSearchParams(location.search);
        const meta_connected = params.get("meta_connected");
        const meta_error = params.get("meta_error");
        const errorMsg = params.get("message");
        const userId = params.get("userId");
        const code = params.get("code");
        
        console.log("MetaCallback: Parâmetros da URL:", { 
          meta_connected, meta_error, errorMsg, userId, code,
          searchParams: location.search
        });
        setDebugInfo(prev => prev + `\nParâmetros: ${JSON.stringify({ meta_connected, meta_error, userId, code })}`);

        // Verificar se há erro na URL
        if (meta_error === "true" && errorMsg) {
          console.error("MetaCallback: Erro recebido na URL:", errorMsg);
          setDebugInfo(prev => prev + `\nErro na URL: ${errorMsg}`);
          throw new Error(decodeURIComponent(errorMsg));
        }

        // Verificar se a conexão foi bem-sucedida
        if (meta_connected === "true" && userId) {
          console.log("MetaCallback: Conexão bem-sucedida, userId:", userId);
          setDebugInfo(prev => prev + "\nConexão bem-sucedida com userId: " + userId);
          
          // Obter informações do usuário do localStorage
          const userInfoStr = localStorage.getItem("userInfo");
          if (!userInfoStr) {
            console.error("MetaCallback: Informações do usuário não encontradas no localStorage");
            setDebugInfo(prev => prev + "\nErro: userInfo não encontrado no localStorage");
            throw new Error("Informações do usuário não encontradas");
          }

          const userInfo = JSON.parse(userInfoStr);
          console.log("MetaCallback: userInfo do localStorage:", userInfo);
          
          // Atualizar informações do usuário no localStorage
          const updatedUserInfo = {
            ...userInfo,
            metaConnectionStatus: "connected",
            isMetaConnected: true
          };

          localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
          console.log("MetaCallback: localStorage atualizado com status de conexão");
          setDebugInfo(prev => prev + "\nLocalStorage atualizado com status de conexão");

          // Mostrar mensagem de sucesso
          toast({
            title: "Conectado com sucesso!",
            description: "Sua conta Meta foi conectada com sucesso.",
          });

          // Redirecionar para o dashboard com um pequeno atraso para garantir que o toast seja exibido
          console.log("MetaCallback: Preparando redirecionamento para dashboard");
          setDebugInfo(prev => prev + "\nPreparando redirecionamento para dashboard");
          
          setTimeout(() => {
            console.log("MetaCallback: Redirecionando para o dashboard após conexão bem-sucedida");
            setDebugInfo(prev => prev + "\nRedirecionando para /dashboard");
            window.location.href = "/dashboard"; // Usando window.location para forçar refresh completo
          }, 2000);
          
          return;
        }

        // Se não houver parâmetros de sucesso ou erro, verificar se há código de autorização
        if (code) {
          console.log("MetaCallback: Código de autorização encontrado:", code);
          setDebugInfo(prev => prev + "\nCódigo de autorização encontrado");
          
          // Mostrar mensagem de processamento
          toast({
            title: "Processando conexão",
            description: "Estamos finalizando a conexão com sua conta Meta...",
          });
          
          // Redirecionar para o dashboard após alguns segundos
          console.log("MetaCallback: Preparando redirecionamento para dashboard após receber código");
          setDebugInfo(prev => prev + "\nPreparando redirecionamento para dashboard após receber código");
          
          setTimeout(() => {
            console.log("MetaCallback: Redirecionando para o dashboard após receber código de autorização");
            setDebugInfo(prev => prev + "\nRedirecionando para /dashboard");
            window.location.href = "/dashboard"; // Usando window.location para forçar refresh completo
          }, 2500);
          
          return;
        }
        
        // Se chegou aqui, não há parâmetros válidos
        console.error("MetaCallback: Parâmetros de retorno inválidos");
        setDebugInfo(prev => prev + "\nErro: Parâmetros de retorno inválidos");
        throw new Error("Parâmetros de retorno inválidos");
        
      } catch (err: any) {
        console.error("MetaCallback: Erro ao processar callback do Meta:", err);
        setDebugInfo(prev => prev + `\nErro: ${err.message}`);
        setError(err.message || "Erro ao processar conexão com Meta");
        toast({
          title: "Erro na conexão",
          description: err.message || "Ocorreu um erro ao conectar com o Meta",
          variant: "destructive",
        });

        // Redirecionar para a página de conexão após alguns segundos
        setTimeout(() => {
          console.log("MetaCallback: Redirecionando para página de conexão após erro");
          setDebugInfo(prev => prev + "\nRedirecionando para /connect-meta após erro");
          navigate("/connect-meta");
        }, 4000);
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl text-center mx-4">
        <div className="flex justify-center">
          <svg className="w-12 h-12 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path d="M945.4 512q0 104-51 192t-137 148-199 80q-100 0-183-47t-138-125l-33 117q-6 24-28 30t-38-10L70 691q-18-12-18-34 0-10 8-21l184-410q10-22 33-28t39 10l117 52q21 9 28 31t-1 40q-28 100-28 118 0 19 13 31t32 12q18 0 31-12t18-30q1-3 1-4 20-61 60-105t92-69q52-26 110-26 104 0 180 69t104 177q-1 11-1 17zm-427-90q-11 35-32 62t-51 43q-30 16-64 16-43 0-78-22t-55-59q-2-4-2-6 0-16 16-27t38-11q23 0 41 14t24 36q1 3 1 4 10 27 32 44t50 17q28 0 51-16t35-44q1-2 1-4 0-16-16-27t-38-11q-23 0-41 14t-24 36q-1 3-1 4-10 27-32 44t-50 17q-28 0-51-16t-35-44q-1-2-1-4 0-16-16-27t-38-11q-48 0-87 30t-60 79q-21 49-21 103 0 81 45 151t121 108 177 38q86 0 158-39t119-106 46-159q0-70-33-131t-90-99q-57-38-124-38-54 0-102 22z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-800">
          {loading ? "Processando conexão..." : error ? "Erro na conexão" : "Conectado com sucesso!"}
        </h2>

        <p className="text-gray-500">
          {loading 
            ? "Estamos finalizando a conexão com sua conta Meta..." 
            : error 
              ? `${error}. Redirecionando...` 
              : "Você será redirecionado para o dashboard automaticamente."}
        </p>

        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}
        
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
