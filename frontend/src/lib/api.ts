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

// Interceptor para melhorar o tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Melhorar mensagens de erro para o usuário
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error('Erro na resposta da API:', error.response.status, error.response.data);
      const errorMessage = error.response.data?.message || 'Erro na comunicação com o servidor';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
      return Promise.reject(new Error('Servidor não respondeu. Verifique sua conexão.'));
    } else {
      // Erro na configuração da requisição
      console.error('Erro na configuração da requisição:', error.message);
      return Promise.reject(new Error('Erro ao preparar requisição.'));
    }
  }
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
    console.error('Erro no registro:', error);
    throw error;
  }
};

export const loginUser = async (credentials: any) => {
  try {
    console.log('Tentando login com:', credentials.email);
    console.log('URL da API:', API_BASE_URL);
    
    const response = await api.post(`/auth/login`, credentials);
    console.log('Resposta do login:', response.data);
    
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
    console.error('Erro detalhado no login:', error);
    throw error;
  }
};

export const logoutUser = () => localStorage.removeItem('userInfo');

export const getUserProfile = async () => {
  try {
    // Corrigido para usar o endpoint correto conforme definido no backend
    const response = await api.get(`/auth/profile`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error);
    throw new Error(error.response?.data?.message || "Erro ao buscar perfil do usuário.");
  }
};

export const updateUserProfile = async (userData: any) => {
  try {
    const userId = JSON.parse(localStorage.getItem('userInfo') || '{}')._id;
    if (!userId) throw new Error("ID do usuário não encontrado.");
    
    // Corrigido para usar o endpoint correto
    const response = await api.put(`/users/${userId}`, userData);
    
    // Atualizar informações do usuário no localStorage
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser)); // Corrigido para usar updatedUser
    
    return response.data;
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    throw new Error(error.response?.data?.message || "Erro ao atualizar perfil.");
  }
};

export const updateUserPlan = async (planData: any) => {
  try {
    const userId = JSON.parse(localStorage.getItem('userInfo') || '{}')._id;
    if (!userId) throw new Error("ID do usuário não encontrado.");
    
    const response = await api.put(`/users/${userId}/plan`, planData);
    
    // Atualizar informações do usuário no localStorage
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUser.plan = planData.plan;
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
    
    // The backend /api/meta/login is expected to return a redirect URL or handle the redirect itself.
    // For frontend, we can directly point the window.location.href to this backend endpoint.
    // The backend will then redirect to Facebook, and Facebook will redirect back to the specified callback URI.
    const backendFacebookLoginUrl = `${API_BASE_URL}/meta/login?token=${encodeURIComponent(token)}`;
    window.location.href = backendFacebookLoginUrl;
  } catch (error: any) {
    console.error("Error constructing Facebook login URL:", error);
    throw new Error(error.message || "Erro ao iniciar conexão com Facebook.");
  }
};

// Menu Items API calls (Real)
export const getMenuItems = async () => {
  try {
    const response = await api.get(`/menu`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar itens do cardápio (API Real):", error);
    // Fallback to placeholder data if API fails, to maintain some UI functionality
    // This could be removed if strict API-only data is required.
    // throw new Error(error.response?.data?.message || "Erro ao buscar itens do cardápio.");
     return [
        { _id: "ph1", name: "Falha ao carregar Burger", price: 0, imageUrl: "/placeholder-burger1.jpg" },
        { _id: "ph2", name: "Falha ao carregar Pizza", price: 0, imageUrl: "/placeholder-pizza2.jpg" },
    ];
  }
};

export const addMenuItem = async (item: any) => {
  try {
    const response = await api.post(`/menu`, item);
    return response.data; // Backend should return the created item with its new _id
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao adicionar item ao cardápio.");
  }
};

// Ad Campaign API calls
export const createAdCampaign = async (details: any) => {
  try {
    // This will call the backend endpoint responsible for creating campaigns on Meta.
    // The 'details' object should contain all necessary info: budget, radius, ad creative (text, image/video ID), etc.
    // If it's an IA-simulated campaign, the 'details' might include simulated creative content.
    const response = await api.post(`/ads/campaigns`, details);
    return response.data; // Expected: { message: "Campanha criada com sucesso!", campaignId: "actual_campaign_id" }
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao criar campanha de anúncios.");
  }
};

export const getMetaAdAccounts = async () => {
  try {
    const response = await api.get(`/meta/adaccounts`);
    return response.data; // Expected: [{ id: "act_123", name: "Conta Principal" }, ...]
  } catch (error: any) {
    // Fallback for UI if needed, or just throw error
    // throw new Error(error.response?.data?.message || "Erro ao buscar contas de anúncio.");
    console.warn("API /meta/adaccounts não implementada ou falhou, usando simulação.");
    return [{ id: "act_sim_12345", name: "Conta de Anúncio (Simulada - API Falhou)" }];
  }
};

// This function might be for fetching metrics for an *existing* campaign from Meta via backend.
// Or it could be a general metrics overview.
export const getMetaLiveMetrics = async () => {
  try {
    const response = await api.get(`/meta/metrics`); // Assuming a generic metrics endpoint
    return response.data;
  } catch (error: any) {
    // Fallback for UI if needed
    // throw new Error(error.response?.data?.message || "Erro ao buscar métricas.");
    console.warn("API /meta/metrics não implementada ou falhou, usando simulação.");
    return {
        reach: Math.floor(Math.random() * 100 + 10),
        clicks: Math.floor(Math.random() * 20 + 5),
        spend: (Math.random() * 10 + 2).toFixed(2),
        ctr: (Math.random() * 0.5 + 0.1).toFixed(2),
      };
  }
};

// Restaurant Info - Assuming there's a backend endpoint for this
export const saveRestaurantInfo = async (data: any) => {
  try {
    // Assuming an endpoint like /restaurant/info or similar for saving/updating restaurant details
    const response = await api.post(`/restaurant/info`, data); // or PUT if it's an update
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao salvar informações do restaurante.");
  }
};

// Placeholder for fetching user's campaigns from backend (if needed for dashboard display)
export const getUserCampaigns = async () => {
    try {
        const response = await api.get(`/ads/campaigns`);
        return response.data;
    } catch (error: any) {
        console.error("Erro ao buscar campanhas do usuário:", error);
        return []; // Return empty array on error to avoid UI crash
    }
};
