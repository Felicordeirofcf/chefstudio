import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// Função para ler o usuário do localStorage
const getUserInfo = () => {
  try {
    const data = localStorage.getItem("userInfo");
    return data ? JSON.parse(data) : null;
  } catch {
    localStorage.removeItem("userInfo");
    return null;
  }
};

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userInfo = getUserInfo();
  const location = useLocation();

  if (!userInfo || !userInfo.token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (userInfo.metaConnectionStatus !== "connected" && location.pathname !== "/connect-meta") {
    return <Navigate to="/connect-meta" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
