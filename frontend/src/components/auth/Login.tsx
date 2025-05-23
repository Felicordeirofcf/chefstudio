import React from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useState } from 'react';
import { loginUser } from "../../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const imageUrl = "/image.png"; // Local: public/image.png
  
  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Melhorado para capturar e exibir erros mais detalhados
      const response = await loginUser({ email, password });
      
      if (!response?.token || !response?._id) {
        throw new Error("Login mal sucedido: token ou ID do usuário ausentes.");
      }
      
      // Armazena os dados diretamente
      localStorage.setItem("userInfo", JSON.stringify({
        token: response.token,
        _id: response._id,
        name: response.name || '',
        email: response.email,
        metaUserId: response.metaUserId || '',
        metaConnectionStatus: response.metaConnectionStatus || 'disconnected',
        isMetaConnected: response.metaConnectionStatus === "connected"
      }));
      
      // Armazenar token separadamente para compatibilidade
      localStorage.setItem("token", response.token);
      
      console.log("Login bem-sucedido, dados armazenados:", {
        token: response.token,
        _id: response._id,
        metaConnectionStatus: response.metaConnectionStatus
      });
      
      // Verifica se o usuário está conectado ao Meta Ads
      if (response.metaConnectionStatus !== "connected") {
        // Se não estiver conectado, redireciona para a página de conexão Meta
        console.log("Usuário não conectado ao Meta Ads, redirecionando para /connect-meta");
        navigate("/connect-meta");
      } else {
        // Se já estiver conectado, redireciona para o dashboard
        console.log("Usuário já conectado ao Meta Ads, redirecionando para /dashboard");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setError(err.message || "Falha ao fazer login. Verifique suas credenciais.");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden mx-4 sm:mx-0">
        <div className="w-1/2 hidden md:block relative">
          <img
            src={imageUrl}
            alt="Chef sorrindo"
            className="object-cover w-full h-full"
          />
        </div>
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">Bem vindo(a)</h2>
          <p className="text-center text-gray-500 mb-10">Faça login para continuar</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              id="email"
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="password"
              type="password"
              placeholder="Senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md font-semibold transition duration-300 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "ENTRAR"}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-purple-600 hover:underline font-medium">
                Crie uma agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
