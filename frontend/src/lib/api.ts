import axios from 'axios';

// Definir a URL base correta para o backend na Railway
// Removendo o '/api' do final para evitar duplicação
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";

// Função para obter token JWT do localStorage (chave 'user')
const getToken = (): string | null => {
  try {
    const userString = localStorage.getItem("user"); // Usar a chave 'user' conforme especificado
    if (userString) {
      const parsedUser = JSON.parse(userString);
      if (parsedUser && parsedUser.token) {
        return parsedUser.token;
      }
    }
    // Tentar também a chave 'userInfo' como fallback temporário, se necessário
    const userInfoString = localStorage.getItem("userInfo");
    if (userInfoString) {
        const parsedUserInfo = JSON.parse(userInfoString);
        if (parsedUserInfo && parsedUserInfo.token) {
            console.warn("Token encontrado em 'userInfo', considere padronizar para 'user'.");
            return parsedUserInfo.token;
        }
    }
    // Tentar também a chave 'token' como fallback
    const directToken = localStorage.getItem("token");
    if (directToken) {
        console.warn("Token encontrado diretamente em 'token', considere padronizar para 'user'.");
        return directToken;
    }

    return null;
  } catch (error) {
    console.error("Erro ao obter token do localStorage:", error);
    // Limpar chaves relevantes em caso de erro de parse
    localStorage.removeItem("user");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
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
    const response = await api.post(`/api/auth/register`, userData);
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};
    if (!token || !_id) throw new Error("Registro mal sucedido: token ou dados do usuário ausentes.");
    
    // Padronizar o objeto do usuário para salvar
    const userToStore = {
      token,
      _id,
      name,
      email,
      metaUserId,
      metaConnectionStatus,
      plan,
      isMetaConnected: metaConnectionStatus === "connected"
    };
    
    // Salvar APENAS na chave 'user'
    localStorage.setItem("user", JSON.stringify(userToStore));
    // Remover salvamentos antigos/redundantes
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    
    return userToStore;
  } catch (error: any) {
    console.error("Erro no registro:", error);
    throw error;
  }
};

export const loginUser = async (credentials: any) => {
  try {
    console.log("Tentando login com:", credentials.email);
    console.log("URL da API:", API_BASE_URL);
    
    const response = await api.post(`/api/auth/login`, credentials);
    console.log("Resposta do login:", response.data);
    
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};
    if (!token || !_id) throw new Error("Login mal sucedido: token ou dados do usuário ausentes.");
    
    // Padronizar o objeto do usuário para salvar
    const userToStore = {
      token,
      _id,
      name,
      email,
      metaUserId,
      metaConnectionStatus,
      plan,
      isMetaConnected: metaConnectionStatus === "connected"
    };
    
    // Salvar APENAS na chave 'user'
    localStorage.setItem("user", JSON.stringify(userToStore));
    // Remover salvamentos antigos/redundantes
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
    
    return userToStore;
  } catch (error: any) {
    console.error("Erro detalhado no login:", error);
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
    const response = await api.get(`/api/users/${userId}`);
    
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
    const response = await api.put(`/api/users/${userId}`, userData);
    
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
    
    const response = await api.put(`/api/users/${userId}/plan`, planData);
    
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
    
    const response = await api.get(`/api/menu`);
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
    
    const response = await api.post(`/api/menu`, item);
    return response.data; // Backend should return the created item with its new _id
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao adicionar item ao cardápio.");
  }
};

// Ad Campaign API calls - CORRIGIDO para usar o endpoint correto
export const createAdCampaign = async (details: any) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para criar campanhas.");
    }
    
    // Corrigido para usar o endpoint correto conforme definido no backend
    const response = await api.post(`/api/meta/create-ad-from-post`, details);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erro ao criar campanha de anúncios.");
  }
};

// Placeholder for fetching user's campaigns from backend (if needed for dashboard display)
export const getUserCampaigns = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar campanhas sem token');
      return []; // Return empty array on error to avoid UI crash
    }
    
    // Corrigido para usar o endpoint correto conforme definido no backend
    const response = await api.get(`/api/meta/connection-status`);
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar campanhas do usuário:", error);
    return []; // Return empty array on error to avoid UI crash
  }
};

// Exportar a instância api para uso em componentes
export { api };
// Também exportar como default para compatibilidade máxima
export default api;
