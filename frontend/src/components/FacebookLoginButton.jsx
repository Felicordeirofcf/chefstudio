import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { FaFacebook } from 'react-icons/fa';
import { useToast } from '../hooks/use-toast';

const FacebookLoginButton = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // Consumir a URL de autenticação diretamente da API do backend
      const backendUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/auth/facebook`);
      
      if (!response.ok) {
        throw new Error(`Erro ao obter URL de autenticação: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error("URL de autenticação não retornada pelo servidor");
      }
      
      // Redirecionar para a URL fornecida pelo backend
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Erro ao iniciar login com Facebook:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar com Facebook",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleFacebookLogin}
      disabled={loading}
      className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center gap-2"
    >
      <FaFacebook size={20} />
      <span>{loading ? "Conectando..." : "Entrar com Facebook"}</span>
    </Button>
  );
};

export default FacebookLoginButton;
