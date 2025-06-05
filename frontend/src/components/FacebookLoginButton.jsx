
import React, { useState } from 'react';
import { Button } from './ui/button';
import { FaFacebook } from 'react-icons/fa';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api'; // <<< Importar instância centralizada da API

const FacebookLoginButton = ({ onLoginSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // <<< CORRIGIDO: Chamar a rota correta para obter a URL de autenticação Meta >>>
      const response = await api.get('/api/meta/auth-url');

      const data = response.data;

      if (!data || !data.authUrl) {
        throw new Error("URL de autenticação Meta não retornada pelo servidor");
      }

      // Redirecionar para a URL de autenticação fornecida pelo backend
      window.location.href = data.authUrl;

      // O onLoginSuccess provavelmente não é chamado aqui, pois o fluxo continua no callback
      // if (onLoginSuccess) {
      //   onLoginSuccess(data); // Ajustar conforme necessário
      // }

    } catch (error) {
      console.error("Erro ao iniciar conexão com Meta:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || error.message || "Erro ao iniciar conexão com Meta",
        variant: "destructive",
      });
      setLoading(false);
    }
    // Não definir setLoading(false) aqui, pois a página será redirecionada
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      disabled={loading}
      className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center gap-2"
    >
      <FaFacebook size={20} />
      {/* O texto pode ser mais genérico, como Conectar com Facebook/Meta */}
      <span>{loading ? "Conectando..." : "Conectar com Facebook"}</span>
    </Button>
  );
};

export default FacebookLoginButton;

