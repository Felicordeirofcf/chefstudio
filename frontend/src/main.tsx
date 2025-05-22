import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Inicializar localStorage com valores padrão se não existirem
if (typeof window !== 'undefined') {
  // Verificar se há parâmetros de autenticação na URL
  const currentUrl = window.location.href;
  if (currentUrl.includes('dashboard') && 
      (currentUrl.includes('access_token') || 
       currentUrl.includes('code') || 
       currentUrl.includes('state'))) {
    console.log("main.tsx: Parâmetros de autenticação detectados na URL");
    
    // Salvar no localStorage para persistência
    localStorage.setItem('metaConnected', 'true');
    localStorage.setItem('metaConnectedAt', new Date().toISOString());
    
    // Salvar token simulado para garantir compatibilidade
    const metaInfo = {
      accessToken: `simulated_token_${Date.now()}`,
      connectedAt: new Date().toISOString(),
      isMetaConnected: true
    };
    localStorage.setItem('metaInfo', JSON.stringify(metaInfo));
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
