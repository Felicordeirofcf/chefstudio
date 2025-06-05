
// Componente para autenticação e gerenciamento de perfil
// Arquivo: frontend/src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api'; // Importa a instância configurada do axios

// Chave padrão para armazenar dados do usuário no localStorage
const USER_STORAGE_KEY = 'chefstudio_user';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inicia carregando até a validação estar completa
  const [error, setError] = useState(null);

  // Função para obter dados do usuário do localStorage
  const getUserDataFromStorage = useCallback(() => {
    try {
      const userDataString = localStorage.getItem(USER_STORAGE_KEY);
      return userDataString ? JSON.parse(userDataString) : null;
    } catch (e) {
      console.error("Erro ao ler dados do usuário do localStorage:", e);
      localStorage.removeItem(USER_STORAGE_KEY); // Limpa em caso de erro
      return null;
    }
  }, []);

  // Função para obter apenas o token
  const getToken = useCallback(() => {
    const userData = getUserDataFromStorage();
    return userData?.token || null;
  }, [getUserDataFromStorage]);

  // Função para validar token e buscar perfil
  const validateTokenAndFetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const storedUserData = getUserDataFromStorage();
    const token = storedUserData?.token;

    if (!token) {
      setUser(null);
      setLoading(false);
      localStorage.removeItem(USER_STORAGE_KEY); // Garante limpeza se não há token
      // Limpar chaves antigas também, por segurança
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      return;
    }

    try {
      // Tentar obter perfil atualizado da API (fonte da verdade)
      // A instância 'api' já inclui o token no header via interceptor
      const response = await api.get('/api/profile');

      if (response.data && response.data._id) {
        const profileData = response.data;
        // Mantém o token original, atualiza o resto dos dados
        const updatedUserData = { ...profileData, token: token };
        setUser(updatedUserData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserData));
        console.log('Perfil validado e carregado da API:', profileData);
        // Limpar chaves antigas
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
      } else {
        throw new Error('Resposta de perfil inválida da API');
      }
    } catch (apiErr) {
      console.error('Erro ao validar token/buscar perfil:', apiErr.response?.data?.message || apiErr.message);
      setError('Sessão inválida ou expirada. Faça login novamente.');
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    } finally {
      setLoading(false);
    }
  }, [getUserDataFromStorage]);

  // Carregar e validar usuário ao inicializar
  useEffect(() => {
    validateTokenAndFetchProfile();
  }, [validateTokenAndFetchProfile]);

  // Função para login
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/login', credentials);
      const userData = response.data; // A resposta já deve conter token e dados do usuário

      if (!userData || !userData.token || !userData._id) {
        throw new Error("Login mal sucedido: token ou ID do usuário ausente na resposta.");
      }

      console.log('Login bem-sucedido, salvando dados:', userData);
      // Salvar o objeto completo (incluindo token) na chave padrão
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      // Limpar chaves antigas
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');

      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Erro no login:', err);
      const errorMessage = err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      // Limpar storage em caso de falha no login
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      setUser(null);
      throw new Error(errorMessage); // Re-throw para o componente lidar se necessário
    } finally {
      setLoading(false);
    }
  };

  // Função para logout
  const logout = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('token'); // Limpar chaves antigas também
    localStorage.removeItem('userInfo');
    setUser(null);
    console.log('Usuário deslogado.');
    // O redirecionamento deve ocorrer no componente que chama logout
  }, []);

  // Função para atualizar perfil
  const updateProfile = async (profileUpdateData) => {
    setLoading(true);
    setError(null);
    try {
      const currentUserData = getUserDataFromStorage();
      if (!currentUserData || !currentUserData.token) {
        throw new Error('Usuário não autenticado para atualizar perfil');
      }

      // A instância 'api' já envia o token
      const response = await api.put('/api/profile', profileUpdateData);
      const updatedProfile = response.data;

      // Atualizar estado local e localStorage, mantendo o token original
      const newUserState = { ...updatedProfile, token: currentUserData.token };
      setUser(newUserState);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserState));

      console.log('Perfil atualizado com sucesso:', updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      const errorMessage = err.response?.data?.message || 'Erro ao atualizar perfil.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    updateProfile,
    getToken,
    isAuthenticated: !!user && !loading, // Indica se há um usuário validado e não está carregando
    validateTokenAndFetchProfile // Expor para revalidação manual se necessário
  };
};

