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
            console.log('Usuário carregado do localStorage:', userInfo);
          }
        } catch (err) {
          console.error('Erro ao obter userInfo do localStorage:', err);
        }
        
        // Tentar obter perfil atualizado da API
        try {
          // Obter ID do usuário do localStorage
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const userId = userInfo._id;
          
          if (!userId) {
            console.error('ID do usuário não encontrado no localStorage');
            throw new Error('ID do usuário não encontrado');
          }
          
          // CORREÇÃO: Usar a rota correta do backend para buscar o perfil do usuário
          // Alterado de /api/auth/profile para /api/users/{userId}
          const response = await axios.get(`/api/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 5000 // Timeout para evitar requisições pendentes
          });
          
          if (response.data) {
            // Garantir que o _id seja preservado
            const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const userId = response.data._id || currentUserInfo._id;
            
            if (!userId) {
              console.error('ID do usuário não encontrado na resposta da API nem no localStorage');
              throw new Error('ID do usuário não encontrado');
            }
            
            // Atualizar localStorage com dados mais recentes, preservando o _id
            const updatedUserInfo = {
              ...response.data,
              _id: userId,
              token,
              metaUserId: response.data.metaUserId || currentUserInfo.metaUserId,
              metaConnectionStatus: response.data.metaConnectionStatus || currentUserInfo.metaConnectionStatus,
              isMetaConnected: (response.data.metaConnectionStatus === "connected") || (currentUserInfo.metaConnectionStatus === "connected")
            };
            
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
            localStorage.setItem('token', token); // Garantir que o token também esteja armazenado separadamente
            
            console.log('Perfil atualizado com sucesso:', updatedUserInfo);
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
      
      if (!token) {
        throw new Error("Login mal sucedido: token ausente na resposta.");
      }
      
      if (!_id) {
        throw new Error("Login mal sucedido: ID do usuário ausente na resposta.");
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
      
      console.log('Login bem-sucedido, salvando dados:', userInfo);
      
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
      
      // Obter ID do usuário atual
      const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const userId = currentUserInfo._id;
      
      if (!userId) {
        throw new Error('ID do usuário não encontrado');
      }
      
      // CORREÇÃO: Usar a rota correta do backend para atualizar o perfil
      // Alterado de /api/auth/profile para /api/users/{userId}
      let response;
      try {
        response = await axios.put(`/api/users/${userId}`, userData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (err) {
        throw err;
      }
      
      // Atualizar localStorage com dados atualizados, preservando o _id e token
      const updatedUserInfo = {
        ...currentUserInfo,
        ...response.data,
        _id: userId, // Garantir que o ID seja preservado
        token // Garantir que o token seja preservado
      };
      
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      localStorage.setItem('token', token); // Garantir que o token também esteja armazenado separadamente
      
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
