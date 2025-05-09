import axios from 'axios';

// ✅ Variável de ambiente (sem /api no final)
const API_BASE_URL = import.meta.env.VITE_API_URL;

// 🔑 Busca token do localStorage
const getToken = (): string | null => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo).token : null;
  } catch (e) {
    console.error("Erro ao ler userInfo:", e);
    localStorage.removeItem('userInfo');
    return null;
  }
};

// ✅ Instância do axios com base URL
const api = axios.create({ baseURL: API_BASE_URL });

// 🔒 Intercepta requisições para injetar JWT
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- 🔐 AUTENTICAÇÃO ---

export const registerUser = async (userData: any) => {
  const response = await api.post(`/auth/register`, userData);
  if (response.data?.token) localStorage.setItem('userInfo', JSON.stringify(response.data));
  return response.data;
};

export const loginUser = async (credentials: any) => {
  const response = await api.post(`/auth/login`, credentials);
  if (response.data?.token) localStorage.setItem('userInfo', JSON.stringify(response.data));
  return response.data;
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
  const response = await api.put(`/auth/profile`, profileData);
  const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const updatedUser = { ...currentUser, ...response.data };
  localStorage.setItem('userInfo', JSON.stringify(updatedUser));
  return response.data;
};

export const updatePlan = async (planData: { planName: string }) => {
  const response = await api.put(`/auth/plan`, planData);
  const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
  currentUser.plan = response.data.plan;
  localStorage.setItem('userInfo', JSON.stringify(currentUser));
  return response.data;
};

// --- 🌐 LOGIN REAL COM META (Facebook OAuth) ---

export const getFacebookLoginUrl = async (): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error("Token JWT não encontrado. Faça login novamente.");

  const loginUrl = `${API_BASE_URL}/api/meta/login`;

  const response = await api.get(loginUrl, {
    headers: { Authorization: `Bearer ${token}` },
    // @ts-ignore
    validateStatus: (status) => status === 302 || status === 200,
  });

  if (response.request?.responseURL) {
    window.location.href = response.request.responseURL;
  } else {
    throw new Error("Erro ao obter URL de redirecionamento.");
  }
};

// --- 🍔 MENU (Simulado) ---

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

// --- 📢 ADS SIMULADOS ---

export const createAdCampaign = async (details: any) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { message: "Campanha criada com sucesso (simulado)", campaignId: `sim_camp_${Date.now()}` };
};

// --- 📊 MÉTRICAS (Simuladas) ---

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

// --- 🍽️ RESTAURANTE (Simulado) ---

export const saveRestaurantInfo = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { message: "Dados salvos (simulado)", data };
};
