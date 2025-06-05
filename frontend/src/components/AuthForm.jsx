
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import FacebookLoginButton from './FacebookLoginButton';
import { useToast } from '../hooks/use-toast';
// Removido: import { api } from '../lib/api'; // Não precisamos mais da instância direta aqui
import { useAuth } from '../hooks/useAuth'; // Importar useAuth para acessar login e validate

// Chave padrão para armazenar dados do usuário no localStorage (deve ser a mesma usada em AuthProvider)
const USER_STORAGE_KEY = 'chefstudio_user';

const AuthForm = ({ isLogin = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Obter as funções necessárias do contexto de autenticação
  const { login, validateTokenAndFetchProfile } = useAuth();

  // Lógica para tratar callback do Facebook (se aplicável)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    const userDataString = queryParams.get('user');

    if (token) {
        console.log("AuthForm: Token encontrado na URL (Facebook callback?)");
        setLoading(true); // Mostrar loading durante o processamento do callback
        try {
            let userToStore = { token };
            if (userDataString) {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                userToStore = { ...userData, token };
            }

            // Salvar na chave padronizada (AuthProvider lerá isso na próxima validação)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToStore));
            // Limpar chaves antigas por segurança
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userInfo');

            console.log('AuthForm: Dados do Facebook salvos, forçando revalidação...');

            // Forçar revalidação do estado de autenticação ANTES de navegar
            validateTokenAndFetchProfile().then(() => {
                console.log("AuthForm: Revalidação pós-Facebook concluída.");
                toast({
                    title: 'Login com Facebook realizado!',
                    description: 'Bem-vindo ao ChefStudio.',
                    variant: 'success'
                });
                // Limpar a URL e navegar para o dashboard
                navigate('/dashboard', { replace: true });
            }).catch((err) => {
                console.error("AuthForm: Falha na revalidação pós-Facebook:", err);
                localStorage.removeItem(USER_STORAGE_KEY); // Limpar se a validação falhar
                toast({
                    title: 'Erro no Login com Facebook',
                    description: 'Não foi possível validar sua sessão.',
                    variant: 'destructive'
                });
            }).finally(() => {
                setLoading(false);
            });

        } catch (error) {
            console.error("AuthForm: Erro ao processar dados do Facebook:", error);
            toast({
                title: 'Erro no Login com Facebook',
                description: 'Não foi possível processar os dados recebidos.',
                variant: 'destructive'
            });
            localStorage.removeItem(USER_STORAGE_KEY); // Limpar em caso de erro
            setLoading(false);
        }
    }
  }, [location, navigate, toast, validateTokenAndFetchProfile]);

  // Lógica para login/registro tradicional
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userData;
      if (isLogin) {
        // Chamar a função login do AuthProvider
        console.log("AuthForm: Chamando login do AuthProvider...");
        userData = await login({ email, password });
        console.log("AuthForm: Login do AuthProvider concluído.");
      } else {
        // TODO: Implementar registro se necessário, chamando uma função register do AuthProvider
        // Por enquanto, vamos focar no login
        // response = await api.post('/api/auth/register', { name, email, password });
        // userData = response.data;
        // localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        // await validateTokenAndFetchProfile(); // Precisaria revalidar após registro também
        toast({ title: "Registro não implementado", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Se o login foi bem-sucedido (sem exceção), o AuthProvider já atualizou o estado
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao ChefStudio.',
        variant: 'success'
      });

      // Navegar para o dashboard APÓS o login do AuthProvider ter concluído
      console.log("AuthForm: Navegando para /dashboard...");
      navigate('/dashboard');

    } catch (error) {
      console.error('AuthForm: Erro de autenticação:', error);
      toast({
        title: 'Erro de autenticação',
        // Usar a mensagem de erro lançada pelo AuthProvider
        description: error.message || 'Ocorreu um erro durante a autenticação.',
        variant: 'destructive'
      });
      // O AuthProvider já limpou o storage em caso de erro no login
    } finally {
      // Garantir que o loading seja desativado independentemente do resultado
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
                autoComplete="name"
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
              autoComplete="email"
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
              // Autocomplete corrigido conforme solicitado
              autoComplete={isLogin ? "current-password" : "new-password"}
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

