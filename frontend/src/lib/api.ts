// Correção para o arquivo frontend/src/lib/api.ts

import axios from 'axios';

const RAW_BASE_URL = import.meta.env.VITE_API_URL || "https://chefstudio-production.up.railway.app";
const API_BASE_URL = `${RAW_BASE_URL.replace(/\/+$/, "")}/api`;

// Função unificada para obter o token do localStorage
// Verifica tanto 'userInfo' quanto 'user' para compatibilidade
const getToken = (): string | null => {
  try {
    // Primeiro tenta obter de 'userInfo' (formato atual)
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.token || null;
    }
    
    // Se não encontrar, tenta obter de 'user' (formato alternativo)
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      return parsed.token || null;
    }
    
    return null;
  } catch {
    // Em caso de erro, limpa os dados para evitar problemas futuros
    localStorage.removeItem('userInfo');
    localStorage.removeItem('user');
    return null;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL
});

// Interceptor para adicionar token de autenticação em todas as requisições
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

// Função para salvar dados do usuário de forma unificada
const saveUserData = (userData: any) => {
  // Salva em ambos os formatos para garantir compatibilidade
  localStorage.setItem('userInfo', JSON.stringify(userData));
  localStorage.setItem('user', JSON.stringify(userData));
  return userData;
};

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
    
    return saveUserData(userInfo);
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
    
    return saveUserData(userInfo);
  } catch (error: any) {
    console.error('Erro detalhado no login:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('userInfo');
  localStorage.removeItem('user');
};

export const getUserProfile = async () => {
  try {
    console.log('Buscando perfil do usuário...');
    console.log('Token disponível:', !!getToken());
    console.log('URL da API:', `${API_BASE_URL}/auth/profile`);
    
    const response = await api.get(`/auth/profile`);
    console.log('Perfil obtido com sucesso:', response.data);
    
    // Atualiza os dados do usuário no localStorage com as informações mais recentes
    if (response.data) {
      const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUserInfo = { ...currentUserInfo, ...response.data };
      saveUserData(updatedUserInfo);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error);
    throw new Error(error.response?.data?.message || "Erro ao buscar perfil do usuário.");
  }
};

// Manter o restante das funções...

// Exportar as funções
export default api;
