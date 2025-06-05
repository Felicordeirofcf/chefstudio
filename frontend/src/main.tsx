
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './components/dashboard/Dashboard';
import ProfilePage from './components/dashboard/ProfilePage';
import PlansPage from './components/dashboard/PlansPage';
import ConnectMeta from './components/auth/ConnectMeta'; // Manter se ainda for usado
import MetaCallback from './components/auth/MetaCallback'; // Manter se ainda for usado
import AnunciosTabsContainer from './components/AnunciosTabsContainer';
import { MetaAdsProvider } from './contexts/MetaAdsContext';
import { useAuth } from './hooks/useAuth'; // <<< IMPORTAR useAuth
import { Toaster } from "./components/ui/toaster"; // Importar Toaster
import './index.css';

// 🔒 Componente de Rota Protegida Refatorado
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth(); // <<< USAR useAuth
  const location = useLocation();

  if (loading) {
    // Exibir um indicador de carregamento enquanto valida a autenticação
    // TODO: Criar um componente de Spinner/Loading mais elaborado
    return <div>Verificando autenticação...</div>;
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute: Usuário não autenticado (via useAuth), redirecionando para login");
    // Redireciona para a página de login, guardando a localização original
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se autenticado, renderiza o componente filho
  return children;
};

// 🌐 Define as rotas principais
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App como elemento raiz
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      // Rotas que precisam de autenticação
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardHome />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "plans",
            element: <PlansPage />,
          },
          // A rota "anuncios" provavelmente não é necessária aqui,
          // pois AnunciosTabsContainer é renderizado dentro de DashboardHome.
          // Se for uma página separada, manter:
          // {
          //   path: "anuncios",
          //   element: <AnunciosTabsContainer />,
          // },
        ],
      },
      // Rotas auxiliares de conexão Meta (manter protegidas se necessário)
      {
        path: "connect-meta",
        element: (
          <ProtectedRoute>
            <ConnectMeta />
          </ProtectedRoute>
        ),
      },
      {
        path: "meta-callback",
        element: (
          <ProtectedRoute>
            <MetaCallback />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

// Componente Raiz que fornece o contexto de autenticação
const Root = () => {
  // O hook useAuth precisa ser chamado dentro de um componente funcional.
  // Como main.tsx não é um componente, criamos um componente Root
  // que pode usar o hook e passá-lo para o RouterProvider ou filhos.
  // No entanto, a forma mais comum é que os componentes que precisam
  // de autenticação (como ProtectedRoute) chamem useAuth diretamente.
  // O AuthProvider (se existir) deve envolver a aplicação.
  // Neste caso, como useAuth busca dados na inicialização, ele funciona
  // corretamente quando chamado dentro de ProtectedRoute.

  return (
    <React.StrictMode>
      <MetaAdsProvider>
        <RouterProvider router={router} />
        <Toaster /> {/* Adicionar Toaster globalmente */}
      </MetaAdsProvider>
    </React.StrictMode>
  );
};

// Renderização do React
ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);

