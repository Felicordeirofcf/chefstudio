# Instruções de Uso - ChefStudio com Meta Ads (Versão Corrigida V6)

Este documento contém instruções detalhadas sobre as correções e melhorias implementadas no sistema ChefStudio, especialmente relacionadas à integração com Meta Ads.

## Correções Implementadas

### 1. Implementação do Fluxo OAuth2 Direto com Facebook

Foi implementado um fluxo OAuth2 direto com o Facebook, sem depender do backend:
- Botão "Conectar com Meta Ads" que redireciona diretamente para a página de autorização do Facebook
- Processamento do token de acesso retornado pelo Facebook
- Armazenamento seguro do token no localStorage do navegador
- Verificação automática de conexão ao carregar o componente

### 2. Correção do Erro 405 na Criação de Campanhas

O erro 405 (Method Not Allowed) foi corrigido ajustando o endpoint utilizado pelo frontend:
- Endpoint anterior (incorreto): `/api/campaigns/create`
- Endpoint corrigido: `/api/campaigns`

### 3. Melhorias no Fluxo de Criação de Campanhas

O fluxo de criação de campanhas foi aprimorado com:
- Verificação prévia de conexão com Meta Ads
- Upload de imagens/vídeos para anúncios
- Seleção de diferentes objetivos de campanha
- Configurações de público-alvo específicas

### 4. Melhorias na Interface

- Removido o botão "Planos" do menu lateral
- Adicionada exibição do plano ativo na página de perfil do usuário

## Importante: Instruções para Implementação

Para garantir que as alterações surtam efeito no ambiente de produção, siga estas etapas:

1. **Backup**: Faça backup do seu código atual antes de aplicar as alterações

2. **Atualizar Arquivos**: Substitua os seguintes arquivos principais:
   - `frontend/src/components/CampanhaManual.jsx` (implementado com OAuth2 direto)
   - `frontend/src/main.tsx` (removida a rota de planos)
   - `frontend/src/components/layout/DashboardLayout.tsx` (removido o botão de planos)
   - `frontend/src/components/dashboard/ProfilePage.tsx` (adicionada exibição do plano)
   - `frontend/src/lib/api.ts` (corrigido endpoint de campanhas)

3. **Ajustar ID do App Facebook**: 
   - No arquivo `frontend/src/components/CampanhaManual.jsx`, verifique se o ID do App Facebook está correto:
   - Localize a linha: `const FB_APP_ID = '243094272395766';`
   - Se necessário, substitua pelo ID do seu próprio App Facebook

4. **Ajustar URL de Redirecionamento**:
   - No arquivo `frontend/src/components/CampanhaManual.jsx`, verifique se a URL de redirecionamento está correta:
   - Localize a linha: `const FB_REDIRECT_URI = window.location.origin + '/dashboard';`
   - Ajuste conforme necessário para a rota correta do seu dashboard

5. **Limpar Cache**: É essencial limpar o cache do navegador e do servidor:
   ```
   # No navegador
   Ctrl+F5 ou Cmd+Shift+R
   
   # No servidor
   rm -rf frontend/dist
   ```

6. **Reconstruir o Frontend**: Execute os seguintes comandos:
   ```
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

7. **Reiniciar o Servidor**: Reinicie o servidor backend após as alterações

8. **Verificar Implementação**: Verifique se:
   - O botão "Conectar com Meta Ads" aparece quando o usuário não está conectado
   - Ao clicar no botão, você é redirecionado para a página de autorização do Facebook
   - Após a autorização, você é redirecionado de volta ao dashboard com o token na URL
   - O token é automaticamente extraído e salvo no localStorage
   - O formulário de criação de campanhas é exibido após a conexão
   - A criação de campanhas funciona sem erro 405
   - O botão "Planos" não aparece mais no menu lateral
   - O plano ativo é exibido na página de perfil

## Como Usar

### Conectar com Meta Ads

1. Faça login no sistema ChefStudio
2. Navegue até a seção de Meta Ads
3. Clique no botão "Conectar com Meta Ads"
4. Você será redirecionado para a página de autorização do Facebook
5. Autorize o acesso às permissões solicitadas
6. Após autorização, você será redirecionado de volta ao ChefStudio
7. O sistema extrairá automaticamente o token de acesso da URL e o salvará
8. O formulário de criação de campanhas será exibido

### Criar uma Campanha

1. Após conectar com Meta Ads, você verá o formulário de criação de campanhas
2. Preencha os detalhes da campanha:
   - Nome da campanha
   - Orçamento
   - Raio de alcance
   - Texto do anúncio
3. Faça upload de imagens ou vídeos para o anúncio
4. Clique em "Criar Anúncio no Meta Ads"
5. O sistema criará a campanha usando sua conta Meta Ads conectada

### Visualizar Plano Ativo

1. Navegue até "Meu Perfil" no menu lateral
2. Role até o final da página
3. Na seção "Plano Ativo", você verá os detalhes do seu plano atual

## Permissões Necessárias no Meta Developer App

Para que a integração funcione corretamente, certifique-se de que seu Meta Developer App tenha as seguintes permissões:

- `ads_management` - Para gerenciar campanhas publicitárias
- `ads_read` - Para ler dados de campanhas
- `business_management` - Para acessar contas de negócios
- `pages_read_engagement` - Para acessar páginas conectadas
- `instagram_basic` - Para integração com Instagram
- `instagram_content_publish` - Para publicação no Instagram
- `public_profile` - Informações básicas do perfil

## Configuração do App Facebook

Para que o fluxo OAuth2 direto funcione corretamente, você precisa configurar seu App Facebook:

1. Acesse o [Meta for Developers](https://developers.facebook.com/)
2. Selecione seu App
3. Vá para "Configurações" > "Básico"
4. Em "Domínios do App", adicione o domínio do seu frontend (ex: chefstudio.vercel.app)
5. Em "URLs de Redirecionamento OAuth", adicione a URL completa do seu dashboard (ex: https://chefstudio.vercel.app/dashboard)
6. Salve as alterações

## Solução de Problemas

### Erro na Autorização do Facebook

Se você encontrar erros durante a autorização do Facebook:
1. Verifique se o ID do App Facebook está correto no arquivo `CampanhaManual.jsx`
2. Confirme que a URL de redirecionamento está configurada corretamente no App Facebook
3. Verifique se todas as permissões necessárias estão habilitadas no App Facebook
4. Certifique-se de que o App Facebook está em modo "Ao vivo" se estiver em produção

### Token Não Sendo Salvo

Se o token não estiver sendo salvo após o redirecionamento:
1. Verifique se a URL de redirecionamento está correta
2. Confirme que o código está extraindo corretamente o token da URL
3. Verifique se o localStorage está funcionando no navegador
4. Tente limpar o cache do navegador e tentar novamente

### Erro na Criação de Campanhas

Se encontrar erros ao criar campanhas:
1. Verifique se sua conta está conectada ao Meta Ads
2. Certifique-se de que você tem uma conta de anúncios válida
3. Verifique se o formato da imagem/vídeo é suportado
4. Confirme se o orçamento está dentro dos limites permitidos

### Botão de Conexão Não Aparece

Se o botão "Conectar com Meta Ads" não aparecer:
1. Verifique se você está usando a versão mais recente do código
2. Limpe o cache do navegador e do servidor
3. Verifique se o localStorage está sendo limpo corretamente ao fazer logout

## Contato para Suporte

Se precisar de ajuda adicional, entre em contato com o suporte técnico:
- Email: suporte@chefstudio.com
- WhatsApp: (XX) XXXXX-XXXX
