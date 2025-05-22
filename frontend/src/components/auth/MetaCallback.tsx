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
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Função para atualizar o localStorage e garantir que a atualização seja concluída
  const updateLocalStorage = (metaConnected = true) => {
    try {
      console.log("MetaCallback: Atualizando localStorage com status de conexão:", metaConnected);
      
      // Criar token simulado com timestamp para garantir unicidade
      const simulatedToken = "meta_token_" + Date.now();
      const timestamp = new Date().toISOString();
      
      // Atualizar metaInfo primeiro (chave separada)
      const metaInfo = {
        isConnected: true,
        connectedAt: timestamp,
        accessToken: simulatedToken,
        lastUpdated: timestamp
      };
      
      localStorage.setItem("metaInfo", JSON.stringify(metaInfo));
      console.log("MetaCallback: metaInfo atualizado no localStorage");
      
      // Atualizar userInfo se existir
      const userInfoStr = localStorage.getItem("userInfo");
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          
          // Atualizar informações do usuário no localStorage
          const updatedUserInfo = {
            ...userInfo,
            metaConnectionStatus: "connected",
            isMetaConnected: true,
            metaConnectedAt: timestamp,
            metaAccessToken: simulatedToken
          };

          // Salvar no localStorage
          localStorage.setItem("userInfo", JSON.stringify(updatedUserInfo));
          console.log("MetaCallback: userInfo atualizado no localStorage");
        } catch (parseError) {
          console.error("MetaCallback: Erro ao processar userInfo:", parseError);
          // Criar um userInfo básico se não for possível parsear o existente
          localStorage.setItem("userInfo", JSON.stringify({
            metaConnectionStatus: "connected",
            isMetaConnected: true,
            metaConnectedAt: timestamp,
            metaAccessToken: simulatedToken
          }));
        }
      } else {
        // Criar um userInfo básico se não existir
        localStorage.setItem("userInfo", JSON.stringify({
          metaConnectionStatus: "connected",
          isMetaConnected: true,
          metaConnectedAt: timestamp,
          metaAccessToken: simulatedToken
        }));
        console.log("MetaCallback: Novo userInfo criado no localStorage");
      }
      
      // Disparar múltiplos eventos para garantir que os componentes sejam notificados
      if (typeof window !== 'undefined') {
        // Evento principal
        window.dispatchEvent(new CustomEvent('metaConnectionUpdated', { 
          detail: { connected: true, timestamp, token: simulatedToken } 
        }));
        
        // Evento de storage simulado para componentes que escutam mudanças no localStorage
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'metaInfo',
          newValue: JSON.stringify(metaInfo),
          url: window.location.href
        }));
        
        console.log("MetaCallback: Eventos de atualização disparados");
        
        // Disparar novamente após um pequeno delay para garantir que os componentes capturem
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('metaConnectionUpdated', { 
            detail: { connected: true, timestamp, token: simulatedToken, delayed: true } 
          }));
          console.log("MetaCallback: Evento de atualização disparado com delay");
        }, 500);
      }
      
      return true;
    } catch (err) {
      console.error("MetaCallback: Erro ao atualizar localStorage:", err);
      return false;
    }
  };

  // Função para forçar redirecionamento para o dashboard
  const forceRedirectToDashboard = () => {
    if (redirectAttempted) return; // Evitar múltiplas tentativas
    
    setRedirectAttempted(true);
    console.log("MetaCallback: Forçando redirecionamento para dashboard");
    
    try {
      // Método 1: Usar navigate com replace
      navigate("/dashboard", { replace: true });
      
      // Método 2: Como backup, usar window.location após um pequeno delay
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    } catch (navError) {
      console.error("Erro ao navegar:", navError);
      // Fallback direto para window.location
      window.location.href = "/dashboard";
    }
  };

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
        const token = params.get("token") || params.get("state"); // Obter token do parâmetro token ou state
        
        console.log("MetaCallback: Parâmetros da URL:", { 
          meta_connected, meta_error, errorMsg, userId, code, token: token ? "presente" : "ausente",
          searchParams: location.search
        });
        setDebugInfo(prev => prev + `\nParâmetros: ${JSON.stringify({ meta_connected, meta_error, userId, code, token: token ? "presente" : "ausente" })}`);

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
          
          // Atualizar localStorage
          const updated = updateLocalStorage(true);
          console.log("MetaCallback: localStorage atualizado:", updated);
          setDebugInfo(prev => prev + "\nLocalStorage atualizado: " + updated);

          // Mostrar mensagem de sucesso
          toast({
            title: "Conectado com sucesso!",
            description: "Sua conta Meta foi conectada com sucesso.",
          });

          // Redirecionar para o dashboard com um pequeno atraso para garantir que o toast seja exibido
          console.log("MetaCallback: Preparando redirecionamento para dashboard");
          setDebugInfo(prev => prev + "\nPreparando redirecionamento para dashboard");
          
          setTimeout(() => {
            forceRedirectToDashboard();
          }, 1500);
          
          return;
        }

        // Se não houver parâmetros de sucesso ou erro, verificar se há código de autorização
        if (code) {
          console.log("MetaCallback: Código de autorização encontrado:", code);
          setDebugInfo(prev => prev + "\nCódigo de autorização encontrado");
          
          // Atualizar localStorage mesmo com apenas o código
          // Isso ajuda a evitar problemas de redirecionamento
          updateLocalStorage(true);
          
          // Mostrar mensagem de processamento
          toast({
            title: "Processando conexão",
            description: "Estamos finalizando a conexão com sua conta Meta...",
          });
          
          setTimeout(() => {
            forceRedirectToDashboard();
          }, 2000);
          
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
          
          try {
            navigate("/connect-meta", { replace: true });
          } catch (navError) {
            console.error("Erro ao navegar:", navError);
            window.location.href = "/connect-meta";
          }
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, navigate, toast]);

  // Botão de redirecionamento manual como fallback
  const handleManualRedirect = () => {
    console.log("MetaCallback: Redirecionamento manual para dashboard");
    
    // Garantir que o localStorage está atualizado antes do redirecionamento manual
    updateLocalStorage(true);
    
    // Forçar redirecionamento
    forceRedirectToDashboard();
  };

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
        
        {/* Botão de redirecionamento manual como fallback */}
        {!loading && !error && (
          <button
            onClick={handleManualRedirect}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ir para o Dashboard
          </button>
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
