'''# Revisão Completa do Repositório ChefStudio

Este documento detalha os bugs, inconsistências e oportunidades de melhoria identificados durante a revisão completa do código frontend e backend do projeto ChefStudio.

## Frontend

### 1. Gerenciamento de Estado e Autenticação

*   **`main.tsx` / `hooks/useAuth.js`:**
    *   **Problema:** A lógica de `ProtectedRoute` em `main.tsx` é muito básica, verificando apenas a existência de `userInfo.token` no `localStorage`. Não valida o token com o backend nem verifica roles/permissões.
    *   **Problema:** O hook `useAuth.js` e a função `getUserInfo` em `main.tsx` dependem fortemente do `localStorage` para obter informações do usuário e token. Isso pode não ser seguro (vulnerável a XSS) e pode levar a inconsistências se o estado do backend mudar.
    *   **Sugestão:** Centralizar a busca e validação do usuário/token no `useAuth` hook, fazendo uma chamada inicial ao backend (ex: `/api/profile` ou `/api/auth/me`) para validar o token e obter dados frescos. Considerar o uso de HTTP-only cookies para o token JWT para maior segurança.
    *   **Sugestão:** Refatorar `ProtectedRoute` para usar o estado validado do `useAuth` hook em vez de ler diretamente do `localStorage`.
*   **`components/AuthForm.jsx`:**
    *   **Inconsistência:** Lida com um parâmetro de URL `?token=...` após um callback de login do Facebook. Isso parece um fluxo separado e potencialmente legado em comparação com o fluxo OAuth gerenciado pelo `MetaAdsContext` e `/api/meta/callback`. É preciso clarificar se ambos os fluxos são necessários ou se o fluxo de login do Facebook deve ser unificado com o fluxo Meta (se o objetivo for apenas conectar a conta Meta).
*   **`components/FacebookLoginButton.jsx`:**
    *   **Inconsistência/Bug:** Tenta buscar a URL de autenticação em `/api/auth/facebook`, mas a rota correta para iniciar o fluxo OAuth da Meta parece ser `/api/meta/auth-url` (conforme `metaRoutes.js` e `metaController.js`).
    *   **Sugestão:** Corrigir a URL da API chamada para `/api/meta/auth-url`.

### 2. Chamadas de API e Busca de Dados

*   **`components/layout/DashboardLayout.tsx` / `components/dashboard/Dashboard.tsx`:**
    *   **Redundância:** Ambos os componentes buscam o perfil do usuário independentemente usando `getUserProfile` (que lê do `localStorage`).
    *   **Sugestão:** Utilizar o hook `useAuth` para obter os dados do usuário de forma centralizada e evitar múltiplas chamadas ou leituras inconsistentes do `localStorage`.
*   **`components/CampanhaIA.jsx`:**
    *   **Inconsistência Grave:** Gerencia o estado da conexão Meta (status, contas, páginas) de forma independente, usando `axios` e lendo o token diretamente do `localStorage`. Isso conflita diretamente com o `MetaAdsContext`.
    *   **Sugestão:** Refatorar completamente este componente para usar o hook `useMetaAds`, obtendo `metaStatus`, `loading`, `error`, `adAccounts`, `pages` do contexto, similar ao que foi feito em `CampanhaManual.jsx` e `MetaAdsConnection.jsx`.
    *   **Bug Potencial:** Envia `imageUrl` via `FormData` ao backend. O controller backend (`metaAdsController.js`) parece esperar apenas `req.file` (arquivo). É necessário ajustar o backend para aceitar `imageUrl` ou ajustar o frontend para sempre fazer upload (talvez baixando a imagem da URL antes de enviar).

### 3. Lógica de Componentes e UI

*   **`components/dashboard/Dashboard.tsx`:**
    *   **Legado/Inconsistência:** Trata o parâmetro de URL `?meta_connected=true`. O fluxo mais recente (em `MetaAdsConnection.jsx`) usa `?meta_connect=success`. Padronizar para `?meta_connect=success` e garantir que apenas `MetaAdsConnection` (via `MetaAdsContext`) trate disso.
    *   **Incompleto:** A seção de métricas está desabilitada e usando dados placeholder.
*   **`components/CampanhaIA.jsx`:**
    *   **Melhoria:** O componente `SuccessAlert` está definido inline. Mover para `components/ui` ou um diretório de componentes compartilhados para reuso.

### 4. Estrutura e Padrões

*   **Consistência:** O projeto mistura arquivos `.tsx` e `.jsx`. Padronizar para `.tsx` seria ideal em um projeto TypeScript.
*   **SDK do Facebook:** `App.tsx` carrega o SDK do Facebook. Verificar se ainda é necessário após a implementação da integração via API REST e SDK do backend.

## Backend

### 1. Estrutura de Rotas e Arquivos

*   **Redundância/Confusão:** Existem arquivos de rotas duplicados ou com nomes confusos na pasta `routes/` (ex: `authRoutes.js` vs `auth.js`, `metaRoutes.js` vs `meta.js`, `metaAdsRoutes.js` vs `meta-ads.js`). Apenas os arquivos montados em `server.js` (`authRoutes.js`, `user.js`, `metaRoutes.js`, `menu.js`, `healthRoutes.js`, `profile.js`, `metaAdsRoutes.js`, `adRoutes.js`, `openaiRoutes.js`, `ifoodRoutes.js`) parecem estar em uso.
*   **Sugestão:** Remover os arquivos de rotas não utilizados e padronizar os nomes para clareza.

### 2. Controllers e Lógica de Negócios

*   **`controllers/authController.js`:**
    *   **Inconsistência:** A função `facebookCallback` parece duplicar a funcionalidade de `metaController.facebookCallback`. Ambas tentam lidar com o callback OAuth do Facebook/Meta. Isso precisa ser unificado. O fluxo em `metaController` parece mais completo (troca por token longo, busca de páginas/contas).
    *   **Inconsistência:** Retorna `metaConnectionStatus` baseado apenas na existência de `facebookId`. O `metaConnectionStatus` no modelo `User` deve ser a fonte da verdade, gerenciado pelo `metaController`.
    *   **Sugestão:** Remover a lógica de callback do Facebook de `authController.js` e garantir que apenas `/api/meta/callback` (apontando para `metaController.facebookCallback`) seja usado para o fluxo OAuth.
*   **`controllers/metaAdsController.js`:**
    *   **Bug Crítico:** A função `publishPostAndCreateAd` **não trata o caso onde `imageUrl` é enviado em vez de `imageFile`**. Ela só funciona com upload de arquivo (`req.file`).
    *   **Sugestão:** Modificar `publishPostAndCreateAd` para verificar se `req.file` existe. Se não existir, verificar se `req.body.imageUrl` existe. Se `imageUrl` existir, baixar a imagem dessa URL para um buffer e então proceder com a publicação usando o buffer (similar ao que faria com `req.file.buffer`).
    *   **Melhoria:** A criação dos objetos de anúncio (Campaign, AdSet, AdCreative, Ad) tem tratamento de erro genérico. Adicionar tratamento mais específico para erros comuns da API da Meta (permissões, targeting inválido, orçamento mínimo, etc.) pode melhorar o feedback para o usuário.
    *   **Melhoria:** O targeting do AdSet está fixo em `geo_locations: { countries: [\"BR\"] }`. Permitir configuração de targeting mais detalhada (idade, gênero, interesses, localização) via frontend seria uma melhoria significativa.
*   **`controllers/openaiController.js`:**
    *   **Observação:** O comentário menciona GPT-4, mas o código usa `gpt-3.5-turbo`. Confirmar se o modelo desejado está sendo usado.
*   **Controllers Não Utilizados/Incompletos:** Verificar `adController.js`, `menuController.js`, `metaPostController.js` e suas rotas correspondentes para ver se são necessários, se estão completos e se devem ser montados em `server.js`.

### 3. Modelos de Dados

*   **`models/user.js` (ou `userModel.js`):**
    *   **Redundância:** Possui campos `facebookId`, `facebookAccessToken` e também `metaUserId`, `metaAccessToken`. Os campos `meta*` parecem mais completos e alinhados com a integração atual.
    *   **Sugestão:** Padronizar o uso apenas dos campos `meta*` (`metaUserId`, `metaAccessToken`, `metaTokenExpires`, `metaAdAccounts`, `metaPages`, `metaConnectionStatus`) e remover os campos `facebookId` e `facebookAccessToken` para evitar confusão e inconsistência.

### 4. Middlewares

*   **`middleware/corsMiddleware.js`:**
    *   **Segurança:** A lógica atual parece permitir qualquer origem (`origin: true`). Isso é inseguro para produção.
    *   **Sugestão:** Configurar o CORS para permitir apenas as origens específicas do frontend (ex: `https://chefstudio.vercel.app` e `http://localhost:PORTA_FRONTEND`) em vez de `origin: true`.
*   **Middlewares Não Utilizados:** Verificar se `passport.js`, `refreshtoken.js`, `validateMetaToken.js` são necessários ou se são código legado.

### 5. Serviços

*   **`services/ifoodScraper.js`:**
    *   **Fragilidade:** Scraping web (usando Puppeteer) é inerentemente instável e pode quebrar facilmente se o iFood alterar a estrutura do site.
    *   **Sugestão:** Monitorar de perto essa funcionalidade. Se possível, explorar se o iFood oferece alguma API oficial para parceiros que possa substituir o scraping.
*   **`services/openaiService.js`:**
    *   **Redundância:** Parece duplicar a lógica já presente em `openaiController.js`. Manter a lógica em apenas um lugar (provavelmente no controller, ou mover a lógica de chamada OpenAI para o serviço e o controller apenas chamar o serviço).

### 6. Configuração e Ambiente

*   **Erro 404 em Produção:** O erro `404 Not Found` para `/api/meta-ads/campaigns` reportado pelo usuário, apesar da rota existir no código, indica fortemente um problema no **ambiente de produção (Railway)**. Possíveis causas: deploy não atualizado, erro na configuração de rotas do servidor em produção, problema no build.
*   **Sugestão:** Revisar o processo de deploy no Railway, verificar os logs de build e runtime do servidor em produção para identificar por que a rota não está sendo reconhecida.
*   **Variáveis de Ambiente:** Garantir que todas as variáveis de ambiente (`MONGODB_URI`, `JWT_SECRET`, `FB_APP_ID`, `FB_APP_SECRET`, `FACEBOOK_REDIRECT_URI`, `OPENAI_API_KEY`, `VITE_API_URL` no frontend) estejam corretamente configuradas no ambiente de produção (Railway e Vercel).

### 7. Segurança Geral

*   **Validação de Entrada:** A validação de dados recebidos nas requisições (req.body, req.query, req.params) é básica em alguns controllers. Implementar validação mais robusta usando bibliotecas como `express-validator` ou `joi` pode prevenir erros e vulnerabilidades.
*   **Rate Limiting:** Não há evidência de rate limiting nas rotas da API. Implementar rate limiting (ex: usando `express-rate-limit`) é importante para proteger contra ataques de força bruta ou abuso.
*   **Tratamento de Erros:** O tratamento de erros pode ser mais granular, retornando códigos de status HTTP mais específicos e mensagens de erro claras para o frontend, sem expor detalhes internos do servidor.

---

Próximo passo: Aplicar as correções e melhorias sugeridas.
'''
