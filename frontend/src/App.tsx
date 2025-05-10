import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/toaster"; // Assuming you have shadcn/ui toaster setup
import FacebookLogin from "react-facebook-login";

function App() {
  // Função de resposta após o login do Facebook
  const responseFacebook = (response: any) => {
    console.log("Usuário logado com sucesso:", response);
    // Aqui você pode enviar o token para seu backend para autenticar o usuário
    if (response.accessToken) {
      // Exemplo de chamada para o backend
      // fetch('/api/auth/facebook', { method: 'POST', body: JSON.stringify({ token: response.accessToken }) });
    }
  };

  useEffect(() => {
    // Carregar o SDK do Facebook
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* You can add a common layout here if needed (e.g., Navbar, Footer) */}
      <h1>Bem-vindo ao ChefiaStudio</h1>
      {/* Botão de login do Facebook */}
      <FacebookLogin
        appId="719838193777692" // Substitua pelo seu appId
        autoLoad={false}
        fields="name,email,picture"
        callback={responseFacebook}
        icon="fa-facebook"
      />
      {/* O Outlet renderiza os componentes das rotas filhas */}
      <Outlet />
      <Toaster /> {/* To display toasts */}
    </div>
  );
}

export default App;
