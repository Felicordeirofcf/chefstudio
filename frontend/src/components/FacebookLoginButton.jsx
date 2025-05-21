import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { FaFacebook } from 'react-icons/fa';

const FacebookLoginButton = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const handleFacebookLogin = () => {
    // Redirecionar para o endpoint de autenticação do Facebook no backend
    const backendUrl = import.meta.env.VITE_API_URL || 'https://chefstudio-production.up.railway.app';
    window.location.href = `${backendUrl}/api/meta/login?token=${localStorage.getItem('token')}`;
  };

  return (
    <Button
      onClick={handleFacebookLogin}
      className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center gap-2"
    >
      <FaFacebook size={20} />
      <span>Entrar com Facebook</span>
    </Button>
  );
};

export default FacebookLoginButton;
