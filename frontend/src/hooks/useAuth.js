
// Componente para autenticação e gerenciamento de perfil
// Arquivo: frontend/src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading until validation is complete
  const [error, setError] = useState(null);

  // Função para obter token do localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  // Função para validar token e buscar perfil
  const validateTokenAndFetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = getToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      localStorage.removeItem('userInfo'); // Clean up old user info if no token
      return;
    }

    try {
      // Tentar obter perfil atualizado da API (fonte da verdade)
      const response = await api.get('/api/profile'); // Rota principal para perfil

      if (response.data) {
        const profileData = response.data;
        // Armazena dados essenciais (sem token) no estado
        setUser(profileData);
        // Atualiza localStorage com dados frescos (sem token)
        localStorage.setItem('userInfo', JSON.stringify(profileData));
        console.log('Perfil validado e carregado da API:', profileData);
      } else {
        // Se a API retornar dados vazios ou inesperados com sucesso (2xx)
        throw new Error('Resposta de perfil inválida da API');
      }
    } catch (apiErr) {
      console.error('Erro ao validar token/buscar perfil:', apiErr.response?.data?.message || apiErr.message);
      setError('Sessão inválida ou expirada. Faça login novamente.');
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

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

      const { token, ...userData } = response.data || {};

      if (!token || !userData._id) {
        throw new Error("Login mal sucedido: token ou ID do usuário ausente na resposta.");
      }

      console.log('Login bem-sucedido, salvando dados:', userData);

      // Salvar token separadamente
      localStorage.setItem('token', token);
      // Salvar dados do usuário (sem token)
      localStorage.setItem('userInfo', JSON.stringify(userData));

      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Erro no login:', err);
      const errorMessage = err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      throw new Error(errorMessage); // Re-throw para o componente lidar se necessário
    } finally {
      setLoading(false);
    }
  };

  // Função para logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setUser(null);
    // Redirecionar para login ou página inicial pode ser feito no componente que chama logout
    console.log('Usuário deslogado.');
  }, []);

  // Função para atualizar perfil
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Usuário não autenticado para atualizar perfil');
      }

      // Usar a rota /api/profile que foi confirmada como a correta
      const response = await api.put('/api/profile', userData);

      const updatedProfileData = response.data;

      // Atualizar estado local
      setUser(updatedProfileData);
      // Atualizar localStorage (sem token)
      localStorage.setItem('userInfo', JSON.stringify(updatedProfileData));

      console.log('Perfil atualizado com sucesso:', updatedProfileData);
      return updatedProfileData;
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

