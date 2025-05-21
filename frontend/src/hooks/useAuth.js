// Componente para autenticação e gerenciamento de perfil
// Arquivo: frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para obter token do localStorage
  const getToken = () => {
    // Primeiro tenta obter o token diretamente
    let token = localStorage.getItem('token');
    
    // Se não encontrar, tenta obter do userInfo
    if (!token) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        token = userInfo.token;
      } catch (err) {
        console.error('Erro ao obter token do userInfo:', err);
      }
    }
    
    return token;
  };

  // Carregar usuário do localStorage ao inicializar
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // Verificar se há token no localStorage
        const token = getToken();
        
        if (!token) {
          setUser(null);
          return;
        }
        
        // Tentar obter dados do usuário do localStorage
        try {
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          if (userInfo && userInfo._id) {
            setUser(userInfo);
          }
        } catch (err) {
          console.error('Erro ao obter userInfo do localStorage:', err);
        }
        
        // Tentar obter perfil atualizado da API
        try {
          const response = await axios.get('/api/auth/profile', {
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 5000 // Timeout para evitar requisições pendentes
          });
          
          if (response.data) {
            // Atualizar localStorage com dados mais recentes
            const updatedUserInfo = {
              ...response.data,
              token
            };
            
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
            setUser(updatedUserInfo);
          }
        } catch (apiErr) {
          console.warn('Erro ao buscar perfil da API:', apiErr);
          // Não definir erro aqui para não interromper o fluxo
          // Se já temos dados do localStorage, continuamos com eles
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
        setError('Erro ao carregar informações do usuário');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Função para login
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Tentar login com endpoint principal
      let response;
      try {
        response = await axios.post('/api/auth/login', credentials);
      } catch (err) {
        // Se falhar, tentar endpoint alternativo
        if (err.response && err.response.status === 404) {
          response = await axios.post('/api/users/login', credentials);
        } else {
          throw err;
        }
      }
      
      const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};
      
      if (!token || !_id) {
        throw new Error("Login mal sucedido: token ou dados do usuário ausentes.");
      }
      
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
      
      // Salvar em ambos os formatos para compatibilidade
      localStorage.setItem('token', token);
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      setUser(userInfo);
      return userInfo;
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  // Função para atualizar perfil
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        throw new Error('Usuário não autenticado');
      }
      
      // Tentar atualizar com endpoint principal
      let response;
      try {
        response = await axios.put('/api/auth/profile', userData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (err) {
        // Se falhar, tentar endpoint alternativo
        if (err.response && err.response.status === 404) {
          const userId = user?._id;
          if (!userId) throw new Error('ID do usuário não encontrado');
          
          response = await axios.put(`/api/users/${userId}`, userData, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } else {
          throw err;
        }
      }
      
      // Atualizar localStorage com dados atualizados
      const updatedUserInfo = {
        ...user,
        ...response.data,
        token
      };
      
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      setUser(updatedUserInfo);
      
      return updatedUserInfo;
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
    updateProfile,
    getToken
  };
};
