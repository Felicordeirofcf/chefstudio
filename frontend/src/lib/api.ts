import axios from 'axios';

const RAW_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
const API_BASE_URL = `${RAW_BASE_URL.replace(/\/+$/, "")}/api`;

const getToken = (): string | null => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo).token : null;
  } catch {
    localStorage.removeItem('userInfo');
    return null;
  }
};

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const registerUser = async (userData: any) => {
  try {
    const response = await api.post(`/auth/register`, userData);
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};

    if (!token || !_id) throw new Error("Registro mal sucedido: token ou dados do usuário ausentes.");

    const userInfo = {
      token,
      _id,
      name,
      email,
      metaUserId,
      metaConnectionStatus,
      plan,
      isMetaConnected: metaConnectionStatus === "connected"
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    return userInfo;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao registrar usuário.");
  }
};

export const loginUser = async (credentials: any) => {
  try {
    const response = await api.post(`/auth/login`, credentials);
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};

    if (!token || !_id) throw new Error("Login mal sucedido: token ou dados do usuário ausentes.");

    const userInfo = {
      token,
      _id,
      name,
      email,
      metaUserId,
      metaConnectionStatus,
      plan,
      isMetaConnected: metaConnectionStatus === "connected"
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    return userInfo;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao fazer login.");
  }
};

export const logoutUser = () => localStorage.removeItem('userInfo');

export const getUserProfile = async () => {
  try {
    const response = await api.get(`/auth/profile`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) logoutUser();
    throw new Error(error.response?.data?.message || "Erro ao buscar perfil.");
  }
};

export const updateUserProfile = async (profileData: any) => {
  try {
    const response = await api.put(`/auth/profile`, profileData);
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const updatedUser = { ...currentUser, ...response.data };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao atualizar perfil.");
  }
};

export const updatePlan = async (planData: { planName: string }) => {
  try {
    const response = await api.put(`/auth/plan`, planData);
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUser.plan = response.data.plan;
    localStorage.setItem('userInfo', JSON.stringify(currentUser));
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao atualizar plano.");
  }
};

export const getFacebookLoginUrl = async (): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw new Error("Token JWT não encontrado. Faça login novamente.");

    const loginUrl = `${API_BASE_URL}/meta/login?token=${encodeURIComponent(token)}`;
    const response = await api.get(loginUrl, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: (status) => status === 302 || status === 200,
    });

    if (response.request?.responseURL) {
      window.location.href = response.request.responseURL;
    } else {
      throw new Error("Erro ao obter URL de redirecionamento.");
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao obter URL de login do Facebook.");
  }
};

// Simulações
export const getMenuItems = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [
    { id: 1, name: "Hambúrguer Clássico", price: 25, description: "Pão, carne, queijo", imageUrl: "/hamburguer.jpg" },
    { id: 2, name: "Batata Frita", price: 15, description: "Porção generosa", imageUrl: "/batata.jpg" },
    { id: 3, name: "Refrigerante", price: 5, description: "Lata", imageUrl: "/refri.jpg" },
  ];
};

export const addMenuItem = async (item: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { message: "Item adicionado com sucesso (simulado)", item: { ...item, id: `sim_${Date.now()}` } };
};

export const createAdCampaign = async (details: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { message: "Campanha criada com sucesso (simulado)", campaignId: `sim_camp_${Date.now()}` };
};

export const getMetaAdAccounts = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [{ id: "act_123", name: "Conta Principal (Simulada)" }];
};

export const getMetaLiveMetrics = async () => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    reach: Math.floor(Math.random() * 5000 + 1000),
    clicks: Math.floor(Math.random() * 300 + 50),
    spend: (Math.random() * 100 + 20).toFixed(2),
    ctr: (Math.random() * 1.5 + 0.5).toFixed(2),
  };
};

export const saveRestaurantInfo = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { message: "Dados salvos (simulado)", data };
};
