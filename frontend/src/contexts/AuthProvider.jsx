
import React, { useState, useEffect, useCallback } from 'react';
import AuthContext from './AuthContext';
import { api } from '../lib/api'; // Importa a instância configurada do axios

// Chave padrão para armazenar dados do usuário no localStorage
const USER_STORAGE_KEY = 'chefstudio_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inicia carregando até a validação inicial estar completa
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // Função para validar token e buscar perfil (usada na inicialização e revalidação)
  const validateTokenAndFetchProfile = useCallback(async () => {
    console.log("AuthProvider: Iniciando validação de token e perfil...");
    setLoading(true);
    const storedUserData = getUserDataFromStorage();
    const token = storedUserData?.token;

    if (!token) {
      console.log("AuthProvider: Nenhum token encontrado.");
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(USER_STORAGE_KEY);
      setLoading(false);
      return;
    }

    try {
      // A instância 'api' já inclui o token no header via interceptor
      const response = await api.get('/api/profile');
      if (response.data && response.data._id) {
        const profileData = response.data;
        const updatedUserData = { ...profileData, token: token }; // Mantém o token original
        // Atualiza o estado ANTES de salvar no localStorage
        setUser(updatedUserData);
        setIsAuthenticated(true);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUserData));
        console.log('AuthProvider: Perfil validado e carregado da API:', profileData._id);
      } else {
        throw new Error('Resposta de perfil inválida da API');
      }
    } catch (apiErr) {
      console.error('AuthProvider: Erro ao validar token/buscar perfil:', apiErr.message);
      // Limpa o estado e o storage em caso de erro
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setLoading(false);
      console.log("AuthProvider: Validação concluída.");
    }
  }, [getUserDataFromStorage]);

  // Validação inicial ao montar o provider
  useEffect(() => {
    validateTokenAndFetchProfile();
  }, [validateTokenAndFetchProfile]);

  // Função para login
  const login = useCallback(async (credentials) => {
    setLoading(true); // Indica que uma operação de autenticação está em andamento
    try {
      const response = await api.post('/api/auth/login', credentials);
      const userData = response.data;

      if (!userData || !userData.token || !userData._id) {
        throw new Error("Login mal sucedido: token ou ID do usuário ausente na resposta.");
      }

      // Atualiza o estado PRIMEIRO para garantir reatividade
      setUser(userData);
      setIsAuthenticated(true);
      // Depois salva no localStorage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

      console.log('AuthProvider: Login bem-sucedido, estado atualizado para isAuthenticated=true, usuário:', userData._id);
      setLoading(false); // Finaliza o loading APÓS atualizar o estado
      return userData; // Retorna os dados para o AuthForm se necessário

    } catch (err) {
      console.error('AuthProvider: Erro no login:', err);
      // Limpa o estado e o storage em caso de erro
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false); // Finaliza o loading mesmo em caso de erro
      // Re-throw para que o AuthForm possa mostrar o erro
      throw err;
    }
    // Não precisa de finally aqui, pois setLoading(false) é chamado nos blocos try/catch
  }, []);

  // Função para logout
  const logout = useCallback(() => {
    console.log("AuthProvider: Iniciando logout...");
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
    console.log('AuthProvider: Usuário deslogado, estado atualizado para isAuthenticated=false.');
    // O redirecionamento é feito no componente que chama logout (ex: DashboardLayout)
  }, []);

  // Função para atualizar perfil (exemplo, pode ser expandida)
  const updateProfile = useCallback(async (profileUpdateData) => {
    setLoading(true);
    try {
      const response = await api.put('/api/profile', profileUpdateData);
      const updatedProfile = response.data;
      const currentUserData = getUserDataFromStorage(); // Pega dados atuais para manter o token
      const newUserState = { ...updatedProfile, token: currentUserData?.token };
      // Atualiza estado primeiro
      setUser(newUserState);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserState));
      console.log('AuthProvider: Perfil atualizado.');
      setLoading(false);
      return updatedProfile;
    } catch (err) {
      console.error('AuthProvider: Erro ao atualizar perfil:', err);
      setLoading(false);
      throw err; // Re-throw para o componente lidar
    }
  }, [getUserDataFromStorage]);

  // Valor fornecido pelo contexto
  const contextValue = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile,
    validateTokenAndFetchProfile // Expor se necessário revalidar manualmente
  };

  // Adiciona um log para quando o provider renderiza e qual o estado atual
  console.log(`AuthProvider Render: loading=${loading}, isAuthenticated=${isAuthenticated}`);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

