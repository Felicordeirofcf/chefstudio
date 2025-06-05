
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

/**
 * Hook customizado para acessar o contexto de autenticação.
 * Retorna os valores do contexto: user, isAuthenticated, loading, login, logout, etc.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};

