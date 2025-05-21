import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ConnectMeta from './components/auth/ConnectMeta';
import MetaCallback from './components/auth/MetaCallback';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './components/dashboard/Dashboard';
import ProfilePage from './components/dashboard/ProfilePage';
import PlansPage from './components/dashboard/PlansPage';
import { Toaster } from "./components/ui/toaster";
import './index.css';

// 🔐 Lê informações do usuário armazenadas localmente
const getUserInfo = () => {
  const userInfo = localStorage.getItem('userInfo');
  if (!userInfo) return null;
  try {
    return JSON.parse(userInfo);
  } catch (e) {
    localStorage.removeItem('userInfo');
    return null;
  }
};

// 🔒 Rota protegida com verificação de login e conexão Meta Ads
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userInfo = getUserInfo();
  const location = useLocation();
  
  // Verificar se estamos na rota de callback e temos código ou meta_connected na URL
  const isCallbackWithParams = 
    location.pathname === "/meta-callback" && 
    (location.search.includes("code=") || location.search.includes("meta_connected=true"));

  // Se estamos no callback com parâmetros válidos, permitir acesso sem verificações adicionais
  if (isCallbackWithParams) {
    console.log("ProtectedRoute: Permitindo acesso ao callback com parâmetros válidos");
    return children;
  }

  // Verificar autenticação básica
  if (!userInfo || !userInfo.token) {
    console.log("ProtectedRoute: Usuário não autenticado, redirecionando para login");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Verificar se estamos tentando acessar o dashboard e temos conexão Meta
  // ou se estamos em rotas relacionadas à conexão Meta
  const isMetaRoute = location.pathname === "/connect-meta" || location.pathname === "/meta-callback";
  const needsMetaConnection = !isMetaRoute && location.pathname.startsWith("/dashboard");
  const hasMetaConnection = userInfo.metaConnectionStatus === "connected" || userInfo.isMetaConnected === true;

  if (needsMetaConnection && !hasMetaConnection) {
    console.log("ProtectedRoute: Acesso ao dashboard sem conexão Meta, redirecionando para connect-meta");
    return <Navigate to="/connect-meta" state={{ from: location }} replace />;
  }

  // Se já está conectado ao Meta e tenta acessar a página de conexão, redirecionar para dashboard
  if (hasMetaConnection && location.pathname === "/connect-meta") {
    console.log("ProtectedRoute: Usuário já conectado ao Meta, redirecionando para dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// 🌐 Define as rotas principais
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/connect-meta",
    element: (
      <ProtectedRoute>
        <ConnectMeta />
      </ProtectedRoute>
    ),
  },
  {
    path: "/meta-callback",
    element: (
      <ProtectedRoute>
        <MetaCallback />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
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
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>
);
