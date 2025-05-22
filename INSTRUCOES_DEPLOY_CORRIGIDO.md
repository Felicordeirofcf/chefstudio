# Instruções para Deploy do ChefStudio - Versão Corrigida

## Problemas Corrigidos

1. **Dependências Ausentes**:
   - Adicionado `node-fetch` (versão 2.6.12) ao package.json do backend
   - Adicionado `express-async-handler` ao package.json do backend
   - Adicionado `path` ao package.json do backend

2. **Módulos Ausentes**:
   - Criado arquivo `userModel.js` como alias para `user.js` para resolver erro de importação

3. **Configuração do Swagger**:
   - Adicionada configuração completa do Swagger no server.js
   - Registrado endpoint `/api-docs` para documentação da API

4. **Rotas de Autenticação**:
   - Descomentadas e habilitadas as rotas de autenticação (`/api/auth`)
   - Garantido que o endpoint `/api/auth/login` esteja acessível

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

1. Acesse o Swagger em https://chefstudio-production.up.railway.app/api-docs para confirmar que a documentação está acessível
2. Teste o login no frontend para garantir que a rota `/api/auth/login` está funcionando
3. Verifique no console do navegador se todas as requisições estão indo para o domínio correto (Railway)

## Solução de Problemas Comuns

1. **Erro de Módulo Não Encontrado**:
   - Verifique se todas as dependências foram instaladas com `npm install`
   - Confirme que o package.json contém todas as dependências necessárias

2. **Falha no Healthcheck**:
   - Verifique os logs do Railway para identificar erros específicos
   - Confirme que o MongoDB está conectado corretamente
   - Verifique se todas as variáveis de ambiente estão configuradas

3. **Problemas de CORS**:
   - Verifique se o ALLOWED_ORIGINS inclui todos os domínios necessários
   - Limpe o cache do navegador e tente novamente

4. **Erro 404 em Rotas da API**:
   - Verifique se todas as rotas estão corretamente registradas no server.js
   - Confirme que os arquivos de rota estão sendo importados corretamente

## Recomendações Adicionais

1. Considere implementar testes automatizados para garantir a estabilidade das rotas
2. Adicione monitoramento para detectar falhas de CORS ou autenticação no futuro
3. Após confirmar que tudo funciona, restrinja a configuração de CORS para apenas as origens específicas necessárias
