// Componente para autenticação e gerenciamento de perfil
// Arquivo: frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

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
          // CORREÇÃO: Usar a instância api centralizada e a rota /profile para buscar o perfil
          const response = await api.get('/profile');
          
          if (response.data) {
            // Garantir que o _id seja preservado
            const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            
            // Atualizar localStorage com dados mais recentes, preservando o _id e token
            const updatedUserInfo = {
              ...response.data,
              token,
              _id: response.data._id || currentUserInfo._id,
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
          console.warn('Erro ao buscar perfil da API com /profile:', apiErr);
          
          // Tentar rota alternativa se a primeira falhar
          try {
            console.log('Tentando rota alternativa /auth/me para perfil...');
            
            const response = await api.get('/auth/me');
            
            if (response.data) {
              const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
              
              // Atualizar localStorage com dados mais recentes
              const updatedUserInfo = {
                ...response.data,
                token,
                _id: response.data._id || currentUserInfo._id,
                metaUserId: response.data.metaUserId || currentUserInfo.metaUserId,
                metaConnectionStatus: response.data.metaConnectionStatus || currentUserInfo.metaConnectionStatus,
                isMetaConnected: (response.data.metaConnectionStatus === "connected") || (currentUserInfo.metaConnectionStatus === "connected")
              };
              
              localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
              localStorage.setItem('token', token);
              
              console.log('Perfil atualizado com sucesso via rota alternativa:', updatedUserInfo);
              setUser(updatedUserInfo);
            }
          } catch (secondApiErr) {
            console.warn('Erro ao buscar perfil da API com /auth/me:', secondApiErr);
            // Não definir erro aqui para não interromper o fluxo
            // Se já temos dados do localStorage, continuamos com eles
          }
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
      
      // Tentar login com endpoint principal usando a instância api centralizada
      let response;
      try {
        response = await api.post('/auth/login', credentials);
      } catch (err) {
        // Se falhar, tentar endpoint alternativo
        if (err.response && err.response.status === 404) {
          response = await api.post('/users/login', credentials);
        } else {
          throw err;
        }
      }
      
      const { token, _id, name, email, metaUserId, metaConnectionStatus, plan } = response.data || {};
      
      if (!token) {
        throw new Error("Login mal sucedido: token ausente na resposta.");
      }
      
      // Mesmo que não tenha _id, continuamos com o login
      // O _id pode ser obtido posteriormente via perfil
      const userInfo = {
        token,
        _id: _id || '',
        name: name || '',
        email: email || '',
        metaUserId: metaUserId || '',
        metaConnectionStatus: metaConnectionStatus || 'disconnected',
        plan: plan || '',
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
      
      // CORREÇÃO: Usar a instância api centralizada e a rota /profile para atualizar o perfil
      let response;
      try {
        response = await api.put('/profile', userData);
      } catch (err) {
        // Se falhar, tentar rota alternativa
        if (err.response && err.response.status === 404) {
          console.log('Tentando rota alternativa para atualizar perfil...');
          response = await api.put('/auth/profile', userData);
        } else {
          throw err;
        }
      }
      
      // Atualizar localStorage com dados atualizados, preservando o _id e token
      const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUserInfo = {
        ...currentUserInfo,
        ...response.data,
        token // Garantir que o token seja preservado
      };
      
      // Garantir que o _id seja preservado se existir
      if (currentUserInfo._id) {
        updatedUserInfo._id = currentUserInfo._id;
      }
      
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
