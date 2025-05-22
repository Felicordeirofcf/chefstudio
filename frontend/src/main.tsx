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
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './components/dashboard/Dashboard';
import ProfilePage from './components/dashboard/ProfilePage';
import PlansPage from './components/dashboard/PlansPage';
import ConnectMeta from './components/auth/ConnectMeta';
import MetaCallback from './components/auth/MetaCallback';
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

// 🔒 Rota protegida simplificada - apenas verifica login básico
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userInfo = getUserInfo();
  const location = useLocation();
  
  // Verificar apenas autenticação básica
  if (!userInfo || !userInfo.token) {
    console.log("ProtectedRoute: Usuário não autenticado, redirecionando para login");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Permitir acesso a todas as rotas protegidas se o usuário estiver autenticado
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
