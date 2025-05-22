# Instruções para Deploy do ChefStudio

## Visão Geral das Correções

1. **Correção do Swagger**
   - Adicionada documentação OpenAPI completa para todas as rotas
   - Corrigidas definições de operações nas rotas de autenticação, usuários e integração Meta

2. **Correção de CORS**
   - Configuração permissiva para desenvolvimento
   - Headers adicionais para garantir comunicação entre frontend e backend

3. **Correção de Referências de API**
   - Removidas todas as referências ao domínio antigo (onrender.com)
   - Configurado frontend para apontar exclusivamente para o Railway

4. **Correção de Imports/Exports**
   - Corrigidos imports quebrados no frontend
   - Build limpo e sem erros

## Instruções para Deploy

### Backend (Railway)
1. Faça upload do código backend corrigido para o Railway
2. Certifique-se de que as variáveis de ambiente estejam configuradas:
   ```
   ALLOWED_ORIGINS="https://chefstudio.vercel.app,http://localhost:5173,http://localhost:3000,*"
   BASE_URL="https://chefstudio-production.up.railway.app"
   FACEBOOK_REDIRECT_URI="https://chefstudio-production.up.railway.app/api/meta/callback"
   JWT_SECRET="seu_jwt_secret"
   MONGODB_URI="sua_string_de_conexao_mongodb"
   FRONTEND_URL="https://chefstudio.vercel.app"
   ```

### Frontend (Vercel)
1. Faça upload do código frontend corrigido para o Vercel
2. **IMPORTANTE**: Limpe o cache do Vercel após o deploy para garantir que arquivos antigos não sejam servidos
3. Certifique-se de que a variável de ambiente esteja configurada:
   ```
   VITE_API_URL=https://chefstudio-production.up.railway.app
   ```

## Verificação Pós-Deploy

1. Acesse o Swagger em https://chefstudio-production.up.railway.app/api-docs para confirmar que as operações estão visíveis
2. Teste o login no frontend para garantir que não há erros de CORS
3. Verifique no console do navegador se todas as requisições estão indo para o domínio correto (Railway)

## Solução de Problemas

Se ainda houver problemas de CORS após o deploy:
1. Verifique se o cache do navegador foi limpo
2. Confirme que o Vercel está usando a versão mais recente do código
3. Verifique se as variáveis de ambiente estão configuradas corretamente

## Próximos Passos Recomendados

1. Após confirmar que tudo funciona, considere restringir a configuração de CORS para apenas as origens específicas necessárias
2. Implemente testes automatizados para garantir a estabilidade das rotas
3. Adicione monitoramento para detectar falhas de CORS ou autenticação no futuro
