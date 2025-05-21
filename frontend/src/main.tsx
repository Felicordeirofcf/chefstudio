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

  if (!userInfo || !userInfo.token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (
    userInfo.metaConnectionStatus !== "connected" &&
    location.pathname !== "/connect-meta" &&
    location.pathname !== "/meta-callback"
  ) {
    return <Navigate to="/connect-meta" state={{ from: location }} replace />;
  }

  if (
    userInfo.metaConnectionStatus === "connected" &&
    location.pathname === "/connect-meta"
  ) {
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
