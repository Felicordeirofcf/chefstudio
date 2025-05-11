import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "./components/ui/toaster"; // Assuming you have shadcn/ui toaster setup

function App() {
  useEffect(() => {
    // Carregar o SDK do Facebook (pode ser mantido se o SDK for usado em outro lugar, como na conexão de Ads)
    // Se não for usado em mais nenhum lugar, pode ser removido também.
    // Por ora, manterei caso a conexão de Ads dependa dele indiretamente.
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
      {/* O Outlet renderiza os componentes das rotas filhas */}
      <Outlet />
      <Toaster /> {/* To display toasts */}
    </div>
  );
}

export default App;

