// api-fetch.js - Versão otimizada para evitar duplicação de /api
// Esta implementação substitui axios por fetch nativo e corrige os problemas de URL

// Definir a URL base correta para o backend na Railway (com /api no final)
const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";

// Função para normalizar caminhos e evitar duplicação de /api
const normalizePath = (path) => {
  // Remover barras iniciais para garantir consistência
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Verificar se o caminho já começa com 'api/' e remover se necessário
  if (cleanPath.startsWith('api/')) {
    return cleanPath.substring(4);
  }
  
  return cleanPath;
};

// Função melhorada para obter token, verificando múltiplas fontes
const getToken = () => {
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

// Função para criar headers padrão com autenticação
const createHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Token adicionado à requisição');
  }
  
  return headers;
};

// Função para processar respostas e tratar erros de forma consistente
const handleResponse = async (response) => {
  // Verificar se a resposta foi bem-sucedida (status 2xx)
  if (!response.ok) {
    // Tentar obter detalhes do erro do corpo da resposta
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Se não conseguir parsear o JSON, usar mensagem padrão
      errorData = { message: `Erro ${response.status}: ${response.statusText}` };
    }
    
    // Tratamento específico para erros de autenticação
    if (response.status === 401) {
      console.warn('Erro de autenticação detectado, redirecionando para login');
      // Limpar dados de autenticação
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      
      // Redirecionar para login se não estiver já na página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session_expired=true';
      }
    }
    
    // Tratamento específico para erro de conexão Meta
    if (response.status === 400 && errorData.message === 'Usuário não está conectado ao Meta') {
      console.warn('Usuário não está conectado ao Meta, redirecionando para página de conexão');
      
      // Se estiver na página de dashboard, redirecionar para conexão Meta
      if (window.location.pathname.includes('/dashboard')) {
        // Armazenar URL atual para retornar após conexão
        localStorage.setItem('returnUrl', window.location.pathname);
        window.location.href = '/connect-meta?redirect=true';
        return null;
      }
    }
    
    // Lançar erro com mensagem detalhada
    throw new Error(errorData.message || 'Erro na comunicação com o servidor');
  }
  
  // Para respostas vazias (como 204 No Content)
  if (response.status === 204) {
    return null;
  }
  
  // Parsear resposta como JSON
  return response.json();
};

// Implementação das funções da API usando fetch

// Função genérica para requisições
const apiRequest = async (endpoint, method = 'GET', data = null, customHeaders = {}) => {
  try {
    // Normalizar o endpoint para evitar duplicação de /api
    const normalizedEndpoint = normalizePath(endpoint);
    const url = `${API_BASE_URL}/${normalizedEndpoint}`;
    
    const headers = createHeaders(customHeaders);
    
    const options = {
      method,
      headers,
      credentials: 'include' // Para suportar cookies em requisições cross-origin
    };
    
    // Adicionar corpo da requisição para métodos que o suportam
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }
    
    console.log(`Fazendo requisição ${method} para: ${url}`);
    const response = await fetch(url, options);
    return handleResponse(response);
  } catch (error) {
    console.error(`Erro na requisição ${method}:`, error);
    
    // Melhorar mensagem de erro para problemas de rede
    if (error.message === 'Failed to fetch') {
      throw new Error('Falha na conexão com o servidor. Verifique sua internet.');
    }
    
    throw error;
  }
};

// Função para verificar se o backend está online
const checkBackendStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar status do backend:', error);
    return false;
  }
};

// Funções específicas para cada tipo de requisição
export const registerUser = async (userData) => {
  try {
    const data = await apiRequest('auth/register', 'POST', userData);
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = data || {};
    
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
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    console.log('Tentando login com:', credentials.email);
    console.log('URL da API:', API_BASE_URL);
    
    const data = await apiRequest('auth/login', 'POST', credentials);
    console.log('Resposta do login:', data);
    
    const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = data || {};
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
  } catch (error) {
    console.error('Erro detalhado no login:', error);
    throw error;
  }
};

export const logoutUser = () => {
  // Limpar todos os possíveis locais de armazenamento do token
  localStorage.removeItem('userInfo');
  localStorage.removeItem('token');
  localStorage.removeItem('returnUrl');
  
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
    const data = await apiRequest(`users/${userId}`, 'GET');
    
    // Atualizar informações do usuário no localStorage se necessário
    if (data && data._id) {
      const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUser = { ...currentUser, ...data, token: currentUser.token };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    
    // Se for erro de autenticação, tratar especificamente
    if (error.message.includes('autenticado') || error.message.includes('login')) {
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
      throw new Error("Sessão expirada. Por favor, faça login novamente.");
    }
    
    throw error;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para atualizar seu perfil.");
    }
    
    const userId = JSON.parse(localStorage.getItem('userInfo') || '{}')._id;
    if (!userId) throw new Error("ID do usuário não encontrado.");
    
    // Corrigido para usar o endpoint correto
    const data = await apiRequest(`users/${userId}`, 'PUT', userData);
    
    // Atualizar informações do usuário no localStorage
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    
    return data;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
};

export const updateUserPlan = async (planData) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para atualizar seu plano.");
    }
    
    const userId = JSON.parse(localStorage.getItem('userInfo') || '{}')._id;
    if (!userId) throw new Error("ID do usuário não encontrado.");
    
    const data = await apiRequest(`users/${userId}/plan`, 'PUT', planData);
    
    // Atualizar informações do usuário no localStorage
    const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUser.plan = planData.plan;
    localStorage.setItem('userInfo', JSON.stringify(currentUser));
    
    return data;
  } catch (error) {
    throw error;
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
    
    const data = await apiRequest('menu', 'GET');
    return data;
  } catch (error) {
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

export const addMenuItem = async (item) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para adicionar itens ao cardápio.");
    }
    
    const data = await apiRequest('menu', 'POST', item);
    return data; // Backend should return the created item with its new _id
  } catch (error) {
    throw error;
  }
};

// Ad Campaign API calls - CORRIGIDO para usar o endpoint correto
export const createAdCampaign = async (details) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar autenticado para criar campanhas.");
    }
    
    // Verificar conexão Meta antes de tentar criar campanha
    const connectionStatus = await getMetaConnectionStatus();
    if (!connectionStatus.connected) {
      throw new Error("Você precisa conectar sua conta ao Meta Ads primeiro");
    }
    
    // CORRIGIDO: Usar o endpoint correto conforme definido no backend
    const data = await apiRequest('meta/create-ad-from-post', 'POST', details);
    return data;
  } catch (error) {
    throw error;
  }
};

// Função para obter campanhas do usuário
export const getUserCampaigns = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar campanhas sem token');
      return []; // Return empty array on error to avoid UI crash
    }
    
    // CORRIGIDO: Usar o endpoint correto conforme definido no backend
    const data = await apiRequest('meta/campaigns', 'GET');
    return data;
  } catch (error) {
    console.error("Erro ao buscar campanhas do usuário:", error);
    return []; // Return empty array on error to avoid UI crash
  }
};

// Função para verificar status de conexão Meta
export const getMetaConnectionStatus = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de verificar status Meta sem token');
      return { connected: false };
    }
    
    const data = await apiRequest('meta/connection-status', 'GET');
    
    // Atualizar status de conexão no localStorage
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    userInfo.metaConnectionStatus = data.connected ? 'connected' : 'disconnected';
    userInfo.isMetaConnected = data.connected;
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    return data;
  } catch (error) {
    console.error("Erro ao verificar status de conexão Meta:", error);
    return { connected: false, error: error.message };
  }
};

// Função para verificar e atualizar status de conexão Meta
export const verifyMetaConnection = async () => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de verificar conexão Meta sem token');
      return { connected: false };
    }
    
    const data = await apiRequest('meta/verify-connection', 'GET');
    
    // Atualizar status de conexão no localStorage
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    userInfo.metaConnectionStatus = data.connected ? 'connected' : 'disconnected';
    userInfo.isMetaConnected = data.connected;
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    return data;
  } catch (error) {
    console.error("Erro ao verificar conexão Meta:", error);
    return { connected: false, error: error.message };
  }
};

// Função para obter métricas do Meta
export const getMetaMetrics = async (timeRange = 'last_30_days') => {
  try {
    const token = getToken();
    if (!token) {
      console.warn('Tentativa de buscar métricas sem token');
      throw new Error("Você precisa estar autenticado para acessar métricas.");
    }
    
    // Verificar conexão Meta antes de tentar obter métricas
    const connectionStatus = await getMetaConnectionStatus();
    if (!connectionStatus.connected) {
      throw new Error("Usuário não está conectado ao Meta");
    }
    
    const data = await apiRequest(`meta/metrics?timeRange=${timeRange}`, 'GET');
    return data;
  } catch (error) {
    console.error("Erro ao buscar métricas Meta:", error);
    // Retornar dados simulados para evitar quebra da UI
    return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      spend: 0,
      reach: 0,
      frequency: 0,
      error: error.message
    };
  }
};

// Exportar funções individuais
export {
  apiRequest,
  getToken,
  API_BASE_URL,
  checkBackendStatus,
  normalizePath
};

// Exportar como default para compatibilidade máxima
export default {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updateUserPlan,
  getMenuItems,
  addMenuItem,
  createAdCampaign,
  getUserCampaigns,
  getMetaConnectionStatus,
  verifyMetaConnection,
  getMetaMetrics,
  apiRequest,
  getToken,
  API_BASE_URL,
  checkBackendStatus,
  normalizePath
};
