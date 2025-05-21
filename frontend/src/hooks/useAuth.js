// Hook personalizado para gerenciar autenticação e perfil do usuário
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para carregar o perfil do usuário
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obter informações do usuário do localStorage
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      
      if (!userInfo.token) {
        throw new Error('Token não encontrado');
      }
      
      // Fazer requisição para obter o perfil completo
      const response = await axios.get('/api/users/profile', {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        },
        // Adicionar timeout para evitar requisições pendentes
        timeout: 5000
      });
      
      // Atualizar o estado com os dados do usuário
      setUser(response.data);
      
      // Atualizar o localStorage com informações atualizadas
      localStorage.setItem('userInfo', JSON.stringify({
        ...userInfo,
        ...response.data
      }));
      
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      
      // Tratar erros específicos
      if (err.response?.status === 404) {
        setError('API não encontrada. Verifique a conexão com o servidor.');
      } else if (err.response?.status === 401) {
        setError('Sessão expirada. Por favor, faça login novamente.');
        // Limpar dados de autenticação em caso de token inválido
        localStorage.removeItem('userInfo');
      } else {
        setError('Erro ao carregar perfil. Por favor, tente novamente.');
      }
      
      // Manter o usuário atual se houver dados no localStorage
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.name) {
        setUser(userInfo);
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar perfil ao inicializar o hook
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Função para fazer login
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/users/login', credentials);
      
      // Salvar dados no localStorage
      localStorage.setItem('userInfo', JSON.stringify(response.data));
      
      // Atualizar estado
      setUser(response.data);
      
      return response.data;
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError(err.response?.data?.message || 'Erro ao fazer login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer logout
  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  // Função para verificar se o usuário está autenticado
  const isAuthenticated = () => {
    return !!user && !!user.token;
  };

  // Função para atualizar o perfil
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      
      const response = await axios.put('/api/users/profile', userData, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });
      
      // Atualizar localStorage e estado
      const updatedUser = { ...userInfo, ...response.data };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
      throw err;
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
    isAuthenticated,
    updateProfile,
    loadUserProfile
  };
};

export default useAuth;
