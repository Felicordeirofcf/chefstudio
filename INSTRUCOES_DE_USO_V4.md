# Instruções de Uso - ChefStudio com Meta Ads (Versão Corrigida V4)

Este documento contém instruções detalhadas sobre as correções e melhorias implementadas no sistema ChefStudio, especialmente relacionadas à integração com Meta Ads.

## Correções Implementadas

### 1. Adição do Botão "Conectar com Meta Ads"

Foi implementado um botão específico para conectar com o Meta Ads:
- Botão visível quando o usuário não está conectado ao Meta Ads
- Redirecionamento para o fluxo OAuth2 do Facebook
- Armazenamento automático das credenciais após autorização

### 2. Correção do Erro 404 na Conexão com Meta Ads

O erro 404 (Not Found) ao clicar no botão "Conectar com Meta Ads" foi corrigido:
- Substituída a URL relativa por URL absoluta do backend
- Agora o botão direciona para: `https://chefstudio-production.up.railway.app/api/meta/connect`
- Isso garante que o redirecionamento funcione corretamente mesmo quando frontend e backend estão em domínios diferentes

### 3. Correção do Erro 405 na Criação de Campanhas

O erro 405 (Method Not Allowed) foi corrigido ajustando o endpoint utilizado pelo frontend:
- Endpoint anterior (incorreto): `/api/campaigns/create`
- Endpoint corrigido: `/api/campaigns`

### 4. Melhorias no Fluxo de Criação de Campanhas

O fluxo de criação de campanhas foi aprimorado com:
- Verificação prévia de conexão com Meta Ads
- Upload de imagens/vídeos para anúncios
- Seleção de diferentes objetivos de campanha
- Configurações de público-alvo específicas

### 5. Melhorias na Interface

- Removido o botão "Planos" do menu lateral
- Adicionada exibição do plano ativo na página de perfil do usuário

## Importante: Instruções para Implementação

Para garantir que as alterações surtam efeito no ambiente de produção, siga estas etapas:

1. **Backup**: Faça backup do seu código atual antes de aplicar as alterações

2. **Atualizar Arquivos**: Substitua os seguintes arquivos principais:
   - `frontend/src/components/CampanhaManual.jsx` (corrigido com URL absoluta para conexão Meta Ads)
   - `frontend/src/main.tsx` (removida a rota de planos)
   - `frontend/src/components/layout/DashboardLayout.tsx` (removido o botão de planos)
   - `frontend/src/components/dashboard/ProfilePage.tsx` (adicionada exibição do plano)
   - `frontend/src/lib/api.ts` (corrigido endpoint de campanhas)

3. **Ajustar URL do Backend**: 
   - Se seu backend estiver hospedado em um domínio diferente de `https://chefstudio-production.up.railway.app`, você precisará modificar a URL no arquivo `frontend/src/components/CampanhaManual.jsx` para apontar para o seu domínio correto.
   - Localize a linha: `window.location.href = "https://chefstudio-production.up.railway.app/api/meta/connect";`
   - Substitua pela URL do seu backend: `window.location.href = "https://seu-backend.com/api/meta/connect";`

4. **Limpar Cache**: É essencial limpar o cache do navegador e do servidor:
   ```
   # No navegador
   Ctrl+F5 ou Cmd+Shift+R
   
   # No servidor
   rm -rf frontend/dist
   ```

5. **Reconstruir o Frontend**: Execute os seguintes comandos:
   ```
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

6. **Reiniciar o Servidor**: Reinicie o servidor backend após as alterações

7. **Verificar Implementação**: Verifique se:
   - O botão "Conectar com Meta Ads" aparece quando o usuário não está conectado
   - Ao clicar no botão, você é redirecionado para a página de autorização do Facebook (sem erro 404)
   - Após a conexão, o formulário de criação de campanhas é exibido
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
7. O sistema mostrará o formulário de criação de campanhas

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

## Solução de Problemas

### Erro 404 ao Conectar com Meta Ads

Se você ainda encontrar erro 404 ao clicar no botão "Conectar com Meta Ads":
1. Verifique se a URL do backend está correta no arquivo `frontend/src/components/CampanhaManual.jsx`
2. Confirme que o endpoint `/api/meta/connect` existe no seu backend
3. Verifique se o backend está acessível a partir do frontend

### Erro de Autenticação

Se você encontrar erros de autenticação:
1. Verifique se seu token de acesso não expirou
2. Tente desconectar e reconectar sua conta Meta Ads
3. Verifique se as permissões corretas estão habilitadas no Meta Developer App

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
