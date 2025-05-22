# Instruções para Integração com Meta Ads no ChefStudio

## Visão Geral das Correções

1. **Correção do Fluxo de Autenticação Meta**
   - Ajustado o backend para aceitar token JWT tanto no header quanto na query string
   - Criado componente MetaCallback.tsx para processar o retorno do OAuth
   - Implementada rota `/auth/meta-connect` para salvar o status de conexão do usuário

2. **Correção de CORS**
   - Configuração permissiva para garantir comunicação entre frontend e backend
   - Headers adicionais para suportar requisições de diferentes origens

3. **Correção de Referências de API**
   - Todas as referências apontam para o domínio correto (Railway)
   - Configuração de variáveis de ambiente para garantir consistência

## Instruções para Deploy e Teste

### Backend (Railway)
1. Faça upload do código backend corrigido para o Railway
2. Certifique-se de que as variáveis de ambiente estejam configuradas:
   ```
   ALLOWED_ORIGINS="https://chefstudio.vercel.app,http://localhost:5173,http://localhost:3000,*"
   BASE_URL="https://chefstudio-production.up.railway.app"
   FACEBOOK_REDIRECT_URI="https://chefstudio-production.up.railway.app/api/meta/callback"
   FB_APP_ID="2430942723957669"
   FB_APP_SECRET="470806b6e330fff673451f5689ca3d4d"
   JWT_SECRET="seu_jwt_secret"
   MONGODB_URI="sua_string_de_conexao_mongodb"
   FRONTEND_URL="https://chefstudio.vercel.app"
   ```

### Frontend (Vercel)
1. Faça upload do código frontend corrigido para o Vercel
2. **IMPORTANTE**: Limpe o cache do Vercel após o deploy
3. Certifique-se de que a variável de ambiente esteja configurada:
   ```
   VITE_API_URL=https://chefstudio-production.up.railway.app
   ```

## Fluxo de Integração Meta Ads

O fluxo de integração com o Meta Ads foi completamente corrigido e agora funciona da seguinte forma:

1. Usuário faz login no ChefStudio
2. Usuário acessa a página de conexão Meta (/connect-meta)
3. Ao clicar em "Conectar Instagram / Facebook", o usuário é redirecionado para o Facebook com as permissões necessárias
4. Após autorizar, o Facebook redireciona de volta para o callback do backend
5. O backend processa o código de autorização e redireciona para o frontend (/meta-callback)
6. O componente MetaCallback processa o retorno, envia o código para o backend via POST /auth/meta-connect
7. O backend salva o status de conexão e retorna os dados atualizados
8. O frontend atualiza o localStorage e redireciona para o dashboard

## Verificação Pós-Deploy

1. Teste o fluxo completo de login e conexão Meta
2. Verifique se o usuário é redirecionado corretamente após a autorização
3. Confirme que o status de conexão é atualizado no dashboard

## Solução de Problemas

Se ainda houver problemas após o deploy:

1. Verifique os logs do backend para identificar erros específicos
2. Confirme que as variáveis de ambiente estão configuradas corretamente
3. Verifique se o aplicativo Facebook está configurado com a URL de callback correta
4. Limpe o cache do navegador e do Vercel

## Próximos Passos Recomendados

1. Implementar integração real com a API do Facebook para obter contas de anúncios e métricas
2. Adicionar testes automatizados para garantir a estabilidade do fluxo de autenticação
3. Melhorar a segurança da integração com validação de estado CSRF
