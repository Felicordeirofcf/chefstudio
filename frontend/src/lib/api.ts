import axios from 'axios';

const RAW_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
const API_BASE_URL = `${RAW_BASE_URL.replace(/\/+$/, "")}/api`;

// Função melhorada para obter token, verificando múltiplas fontes
const getToken = (): string | null => {
  try {
    // Primeiro tenta obter do localStorage 'userInfo'
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUserInfo = JSON.parse(userInfo);
      if (parsedUserInfo.token) return parsedUserInfo.token;
    }
    
    // Se não encontrar, tenta obter diretamente do localStorage 'token'
    const directToken = localStorage.getItem('token');
    if (directToken) return directToken;
    
    // Se não encontrar em nenhum lugar, retorna null
    return null;
  } catch (error) {
    console.error('Erro ao obter token:', error);
    // Em caso de erro, limpa os storages para evitar problemas futuros
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    return null;
  }
};

const api = axios.create({ baseURL: API_BASE_URL });

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Token adicionado à requisição:', config.url);
    } else {
      console.warn('Token não encontrado para requisição:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Erro no interceptor de requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para melhorar o tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Melhorar mensagens de erro para o usuário
    if (error.response) {
      // O servidor respondeu com um status de erro
      console.error('Erro na resposta da API:', error.response.status, error.response.data);
      
      // Tratamento específico para erros de autenticação
      if (error.response.status === 401) {
        console.warn('Erro de autenticação detectado, redirecionando para login');
        // Limpar dados de autenticação
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        
        // Redirecionar para login se não estiver já na página de login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session_expired=true';
          return Promise.reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
        }
      }
      
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
    
    // Armazenar em ambos os locais para garantir compatibilidade
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('token', token);
    
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
    
    // Armazenar em ambos os locais para garantir compatibilidade
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('token', token);
    
    return userInfo;
  } catch (error: any) {
    console.error('Erro detalhado no login:', error);
    throw error;
  }
};

export const logoutUser = () => {
  // Limpar todos os possíveis locais de armazenamento do token
  localStorage.removeItem('userInfo');
  localStorage.removeItem('token');
  
  // Redirecionar para a página inicial
  window.location.href = '/';
};

export const getUserProfile = async () => {
  try {
    // Verificar se há token antes de fazer a requisição
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar perfil sem token');
      throw new Error("Você precisa estar autenticado para acessar seu perfil.");
    }
    
    // Obter ID do usuário do localStorage
    const userInfo = localStorage.getItem('userInfo');
    let userId = null;
    
    if (userInfo) {
      const parsedUserInfo = JSON.parse(userInfo);
      userId = parsedUserInfo._id;
    }
    
    if (!userId) {
      throw new Error("ID do usuário não encontrado. Por favor, faça login novamente.");
    }
    
    // Usar a rota correta do backend para buscar o perfil do usuário
    const response = await api.get(`/users/${userId}`);
    
    // Atualizar informações do usuário no localStorage se necessário
    if (response.data && response.data._id) {
      const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUser = { ...currentUser, ...response.data, token: currentUser.token };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error);
    
    // Se for erro de autenticação, tratar especificamente
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      throw new Error("Sessão expirada. Por favor, faça login novamente.");
    }
    
    throw new Error(error.response?.data?.message || "Erro ao buscar perfil do usuário.");
  }
};

export const updateUserProfile = async (userData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para atualizar seu perfil.");
    }
    
    const userId = JSON.parse(localStorage.getItem('userInfo') || '{}')._id;
    if (!userId) throw new Error("ID do usuário não encontrado.");
    
    // Corrigido para usar o endpoint correto
    const response = await api.put(`/users/${userId}`, userData);
    
    // Atualizar informações do usuário no localStorage
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    
    return response.data;
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    throw new Error(error.response?.data?.message || "Erro ao atualizar perfil.");
  }
};

export const updateUserPlan = async (planData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para atualizar seu plano.");
    }
    
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

// Menu Items API calls (Real)
export const getMenuItems = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar menu sem token');
      throw new Error("Você precisa estar autenticado para acessar o cardápio.");
    }
    
    const response = await api.get(`/menu`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar itens do cardápio (API Real):", error);
    // Fallback to placeholder data if API fails, to maintain some UI functionality
    return [
      { id: "ph1", name: "Placeholder Burger 1", imageUrl: "/placeholder-burger1.jpg" },
      { id: "ph2", name: "Placeholder Pizza 2", imageUrl: "/placeholder-pizza2.jpg" },
      { id: "ph3", name: "Placeholder Sushi 3", imageUrl: "/placeholder-sushi3.jpg" },
      { id: "ph4", name: "Placeholder Sobremesa 4", imageUrl: "/placeholder-sobremesa4.jpg" },
    ];
  }
};

export const addMenuItem = async (item: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para adicionar itens ao cardápio.");
    }
    
    const response = await api.post(`/menu`, item);
    return response.data; // Backend should return the created item with its new _id
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao adicionar item ao cardápio.");
  }
};

// Meta Ads API calls
export const createCampaign = async (campaignData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para criar campanhas.");
    }
    
    // Obter adAccountId do usuário
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const adAccountId = userInfo.adsAccountId || campaignData.adAccountId;
    
    if (!adAccountId) {
      throw new Error("ID da conta de anúncios não encontrado. Verifique sua conexão com o Meta Ads.");
    }
    
    // Preparar dados para envio
    const dataToSend = {
      ...campaignData,
      adAccountId,
    };
    
    // Usar o endpoint correto
    const response = await api.post('/campaigns', dataToSend);
    
    return response.data;
  } catch (error: any) {
    console.error("Erro ao criar campanha:", error);
    throw new Error(error.response?.data?.message || "Erro ao criar campanha de anúncios.");
  }
};

export const uploadCampaignMedia = async (campaignId: string, mediaFile: File) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para fazer upload de mídia.");
    }
    
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('campaignId', campaignId);
    
    const response = await api.post('/campaigns/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error("Erro ao fazer upload de mídia:", error);
    throw new Error(error.response?.data?.message || "Erro ao fazer upload de mídia para a campanha.");
  }
};

export const getCampaigns = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar campanhas sem token');
      return []; // Return empty array on error to avoid UI crash
    }
    
    // Obter adAccountId do usuário
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const adAccountId = userInfo.adsAccountId;
    
    if (!adAccountId) {
      console.warn('ID da conta de anúncios não encontrado');
      return [];
    }
    
    const response = await api.get(`/campaigns?adAccountId=${adAccountId}`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar campanhas do usuário:", error);
    return []; // Return empty array on error to avoid UI crash
  }
};

export const getCampaignById = async (campaignId: string) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para acessar detalhes da campanha.");
    }
    
    const response = await api.get(`/campaigns/${campaignId}`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar detalhes da campanha:", error);
    throw new Error(error.response?.data?.message || "Erro ao buscar detalhes da campanha.");
  }
};

export const updateCampaignStatus = async (campaignId: string, status: string) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para atualizar o status da campanha.");
    }
    
    const response = await api.put(`/campaigns/${campaignId}/status`, { status });
    return response.data;
  } catch (error: any) {
    console.error("Erro ao atualizar status da campanha:", error);
    throw new Error(error.response?.data?.message || "Erro ao atualizar status da campanha.");
  }
};

export const getCampaignMetrics = async (campaignId: string) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para acessar métricas da campanha.");
    }
    
    const response = await api.get(`/campaigns/${campaignId}/metrics`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar métricas da campanha:", error);
    throw new Error(error.response?.data?.message || "Erro ao buscar métricas da campanha.");
  }
};

// Funções para configurações de localização
export const saveLocationSettings = async (locationData: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para salvar configurações de localização.");
    }
    
    const response = await api.post('/location', locationData);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao salvar configurações de localização:", error);
    throw new Error(error.response?.data?.message || "Erro ao salvar configurações de localização.");
  }
};

export const getLocationSettings = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar configurações de localização sem token');
      return null;
    }
    
    const response = await api.get('/location');
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar configurações de localização:", error);
    return null;
  }
};
