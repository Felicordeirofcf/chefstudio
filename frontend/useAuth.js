// useAuth.js - Hook de autenticação otimizado para usar fetch em vez de axios
import { useState, useEffect, createContext, useContext } from 'react';
import { loginUser, registerUser, logoutUser, getUserProfile } from '../lib/api-fetch';

// Criar contexto de autenticação
const AuthContext = createContext();

// Provider de autenticação para envolver a aplicação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error('Erro ao carregar usuário do localStorage:', err);
        // Limpar localStorage em caso de erro para evitar problemas futuros
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Função de login
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await loginUser({ email, password });
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message || 'Falha no login. Verifique suas credenciais.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função de registro
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const newUser = await registerUser(userData);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err.message || 'Falha no registro. Tente novamente.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = () => {
    setLoading(true);
    try {
      logoutUser();
      setUser(null);
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar o usuário no contexto após mudanças
  const updateUserContext = (updatedData) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUser = { ...currentUser, ...updatedData };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('Erro ao atualizar contexto do usuário:', err);
    }
  };

  // Função para verificar se o usuário está autenticado
  const isAuthenticated = () => {
    return !!user && !!user.token;
  };

  // Função para recarregar o perfil do usuário do backend
  const refreshUserProfile = async () => {
    if (!isAuthenticated()) return;
    
    setLoading(true);
    try {
      const profile = await getUserProfile();
      if (profile) {
        // Manter o token atual ao atualizar o perfil
        const updatedUser = { ...profile, token: user.token };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil do usuário:', err);
      // Se for erro de autenticação, fazer logout
      if (err.message.includes('autenticado') || err.message.includes('login')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Valor do contexto
  const contextValue = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUserContext,
    isAuthenticated,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default useAuth;
