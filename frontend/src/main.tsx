
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
import ConnectMeta from './components/auth/ConnectMeta';
import MetaCallback from './components/auth/MetaCallback';
import { AuthProvider } from './contexts/AuthProvider'; // <<< IMPORTAR AuthProvider
import { MetaAdsProvider } from './contexts/MetaAdsContext';
import { useAuth } from './hooks/useAuth';
import { Toaster } from "./components/ui/toaster";
import './index.css';

// 🔒 Componente de Rota Protegida Refatorado para usar o contexto
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // useAuth agora obtém os valores do AuthContext
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log(`ProtectedRoute: Loading=${loading}, IsAuthenticated=${isAuthenticated}`);

  if (loading) {
    // Exibe um indicador de carregamento enquanto valida a autenticação
    // Idealmente, um componente de Spinner/Loading mais elaborado
    return <div>Verificando autenticação...</div>;
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute: Usuário não autenticado (via useAuth/Context), redirecionando para login");
    // Redireciona para a página de login, guardando a localização original
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Se autenticado, renderiza o componente filho
  console.log("ProtectedRoute: Usuário autenticado, renderizando children.");
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
        ],
      },
      // Rotas auxiliares de conexão Meta (manter protegidas)
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

// Componente Raiz que fornece os contextos
const Root = () => {
  return (
    <React.StrictMode>
      {/* Envolver a aplicação com AuthProvider */}
      <AuthProvider>
        <MetaAdsProvider>
          <RouterProvider router={router} />
          <Toaster />
        </MetaAdsProvider>
      </AuthProvider>
    </React.StrictMode>
  );
};

// Renderização do React
ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);

