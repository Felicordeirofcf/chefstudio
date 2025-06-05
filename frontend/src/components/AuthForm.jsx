
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
import { useAuth } from '../hooks/useAuth'; // Import useAuth para acessar a função de validação

// Chave padrão para armazenar dados do usuário no localStorage (deve ser a mesma usada em useAuth.js)
const USER_STORAGE_KEY = 'chefstudio_user';

const AuthForm = ({ isLogin = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { validateTokenAndFetchProfile } = useAuth(); // Obter a função de validação do hook

  // Verificar se há um token na URL (retorno do login com Facebook)
  // Esta lógica pode precisar ser ajustada dependendo de como o backend retorna o token do Facebook
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const userDataString = queryParams.get('user'); // Supondo que o backend envie dados do usuário também

    if (token && userDataString) {
      try {
        const userData = JSON.parse(decodeURIComponent(userDataString));
        const userToStore = { ...userData, token };

        // Salvar na chave padronizada
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
        // Limpar chaves antigas
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userInfo');

        console.log('Dados do Facebook salvos em', USER_STORAGE_KEY);

        // Forçar revalidação do estado de autenticação ANTES de navegar
        validateTokenAndFetchProfile().then(() => {
          toast({
            title: 'Login com Facebook realizado!',
            description: 'Bem-vindo ao ChefStudio.',
            variant: 'success'
          });
          // Limpar a URL e navegar para o dashboard
          navigate('/dashboard', { replace: true });
        });

      } catch (error) {
        console.error("Erro ao processar dados do Facebook:", error);
        toast({
          title: 'Erro no Login com Facebook',
          description: 'Não foi possível processar os dados recebidos.',
          variant: 'destructive'
        });
      }
    } else if (token) {
        // Se só veio o token (menos ideal, mas tratar)
        console.warn("Recebido apenas token do Facebook, buscando perfil...");
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ token })); // Salva temporariamente só com token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userInfo');

        validateTokenAndFetchProfile().then(() => {
            toast({
                title: 'Login com Facebook realizado!',
                description: 'Bem-vindo ao ChefStudio.',
                variant: 'success'
            });
            navigate('/dashboard', { replace: true });
        }).catch(() => {
            // Se a validação falhar, limpar e ficar no login
            localStorage.removeItem(USER_STORAGE_KEY);
            toast({
                title: 'Erro no Login com Facebook',
                description: 'Não foi possível validar a sessão.',
                variant: 'destructive'
            });
        });
    }
  }, [location, navigate, toast, validateTokenAndFetchProfile]);

  // Lógica para login/registro tradicional
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await api.post('/api/auth/login', { email, password });
      } else {
        response = await api.post('/api/auth/register', { name, email, password });
      }

      const userData = response.data; // Backend deve retornar { token, _id, name, email, ... }

      if (!userData || !userData.token || !userData._id) {
        throw new Error("Resposta inválida do servidor após autenticação.");
      }

      // Salvar na chave padronizada
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      // Limpar chaves antigas
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');

      console.log('Dados de login/registro salvos em', USER_STORAGE_KEY);

      // Forçar revalidação do estado de autenticação ANTES de navegar
      await validateTokenAndFetchProfile();

      toast({
        title: isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!',
        description: 'Bem-vindo ao ChefStudio.',
        variant: 'success'
      });

      // Navegar para o dashboard APÓS a validação
      navigate('/dashboard');

    } catch (error) {
      console.error('Erro de autenticação:', error);
      toast({
        title: 'Erro de autenticação',
        description: error.message || 'Ocorreu um erro durante a autenticação.',
        variant: 'destructive'
      });
      // Limpar storage em caso de erro
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userInfo');
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
                autoComplete="name" // Add autocomplete
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
              autoComplete="email" // Add autocomplete
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
              autoComplete={isLogin ? "current-password" : "new-password"} // Add autocomplete
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
          {/* O FacebookLoginButton deve apenas redirecionar para a URL de auth do backend */}
          {/* O tratamento do callback (com token/user na URL) é feito no useEffect deste componente */}
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

