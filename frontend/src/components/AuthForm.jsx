import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import FacebookLoginButton from './FacebookLoginButton';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';

const AuthForm = ({ isLogin = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar se há um token na URL (retorno do login com Facebook)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    
    if (token) {
      // Salvar token no localStorage
      localStorage.setItem('token', token);
      
      // Buscar informações do usuário
      fetchUserInfo(token);
      
      // Limpar a URL
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

  const fetchUserInfo = async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Salvar informações do usuário
      localStorage.setItem('user', JSON.stringify(response.data));
      
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao ChefStudio.',
        variant: 'success'
      });
      
      // Redirecionar para o dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      toast({
        title: 'Erro de autenticação',
        description: 'Não foi possível obter suas informações.',
        variant: 'destructive'
      });
      
      // Limpar token em caso de erro
      localStorage.removeItem('token');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let response;
      
      if (isLogin) {
        // Login tradicional - Corrigido para remover prefixo '/api' duplicado
        response = await api.post('/auth/login', { email, password });
      } else {
        // Registro - Corrigido para remover prefixo '/api' duplicado
        response = await api.post('/auth/register', { name, email, password });
      }
      
      // Salvar token e informações do usuário
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast({
        title: isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!',
        description: 'Bem-vindo ao ChefStudio.',
        variant: 'success'
      });
      
      // Redirecionar para o dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro de autenticação:', error);
      
      toast({
        title: 'Erro de autenticação',
        description: error.response?.data?.message || 'Ocorreu um erro durante a autenticação.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isLogin ? 'Login' : 'Criar Conta'}</CardTitle>
        <CardDescription>
          {isLogin 
            ? 'Entre com sua conta para acessar o ChefStudio' 
            : 'Crie sua conta para começar a usar o ChefStudio'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </Button>
        </form>
        
        <div className="mt-4 flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>
        
        <div className="mt-4">
          <FacebookLoginButton />
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button 
          variant="link" 
          onClick={() => navigate(isLogin ? '/register' : '/login')}
        >
          {isLogin ? 'Não tem uma conta? Crie agora' : 'Já tem uma conta? Faça login'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
