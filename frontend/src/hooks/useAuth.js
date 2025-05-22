// Componente para autenticação e gerenciamento de usuários
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Criar contexto de autenticação
const AuthContext = createContext(null);

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provedor de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para fazer login
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      // URL base correta para o backend
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      
      // Fazer requisição de login
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      // Extrair dados da resposta
      const { token, user: userData } = response.data;

      // Verificar se temos os dados necessários
      if (!token || !userData || !userData._id) {
        throw new Error('Dados de autenticação incompletos');
      }

      // Armazenar token e informações do usuário
      localStorage.setItem('token', token);
      
      // Garantir que o status de conexão com o Meta Ads seja incluído
      const userInfo = {
        ...userData,
        token,
        metaConnectionStatus: userData.metaConnectionStatus || 'disconnected'
      };
      
      // Armazenar informações completas do usuário
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Atualizar estado
      setUser(userInfo);
      
      console.log('Login realizado com sucesso:', userInfo);
      
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer login';
      setError(errorMessage);
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  // Função para verificar status de autenticação
  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // Verificar se há token e informações do usuário no localStorage
      const token = localStorage.getItem('token');
      const userInfoStr = localStorage.getItem('userInfo');
      
      if (!token || !userInfoStr) {
        // Se não houver token ou informações do usuário, considerar como não autenticado
        setUser(null);
        return false;
      }
      
      // Tentar analisar as informações do usuário
      const userInfo = JSON.parse(userInfoStr);
      
      // URL base correta para o backend
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      
      // Tentar obter perfil do usuário para validar token
      try {
        // Tentar primeiro com a rota de perfil
        const response = await axios.get(`${API_BASE_URL}/users/${userInfo._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Se a requisição for bem-sucedida, atualizar informações do usuário
        const updatedUserInfo = {
          ...userInfo,
          ...response.data,
          token // Manter o token original
        };
        
        // Atualizar localStorage e estado
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        setUser(updatedUserInfo);
        
        return true;
      } catch (profileError) {
        console.warn('Erro ao buscar perfil, tentando rota alternativa:', profileError);
        
        // Se falhar, tentar com a rota de verificação de token
        try {
          const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Se a verificação for bem-sucedida, manter as informações do usuário
          setUser(userInfo);
          return true;
        } catch (verifyError) {
          console.error('Erro ao verificar token:', verifyError);
          
          // Se ambas as tentativas falharem, fazer logout
          logout();
          return false;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      logout();
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Verificar status de conexão com Meta Ads
  const checkMetaConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const userInfoStr = localStorage.getItem('userInfo');
      
      if (!token || !userInfoStr) {
        return { connected: false };
      }
      
      const userInfo = JSON.parse(userInfoStr);
      
      // URL base correta para o backend
      const API_BASE_URL = "https://chefstudio-production.up.railway.app/api";
      
      // Verificar status de conexão com Meta Ads
      const response = await axios.get(`${API_BASE_URL}/meta/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Atualizar status de conexão nas informações do usuário
      const metaConnectionStatus = response.data.connected ? 'connected' : 'disconnected';
      
      const updatedUserInfo = {
        ...userInfo,
        metaConnectionStatus,
        metaToken: response.data.token || userInfo.metaToken
      };
      
      // Atualizar localStorage e estado
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      setUser(updatedUserInfo);
      
      return { connected: response.data.connected, status: metaConnectionStatus };
    } catch (error) {
      console.error('Erro ao verificar conexão com Meta Ads:', error);
      return { connected: false, error: error.message };
    }
  };

  // Verificar autenticação ao inicializar
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
    };
    
    initAuth();
  }, []);

  // Valor do contexto
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    checkMetaConnection,
    isAuthenticated: !!user,
    isMetaConnected: user?.metaConnectionStatus === 'connected'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default useAuth;
