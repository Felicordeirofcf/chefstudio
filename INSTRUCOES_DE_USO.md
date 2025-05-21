# Instruções de Uso - ChefStudio com Meta Ads

Este documento contém instruções detalhadas sobre as correções e melhorias implementadas no sistema ChefStudio, especialmente relacionadas à integração com Meta Ads.

## Correções Implementadas

### 1. Correção do Erro 405 na Criação de Campanhas

O erro 405 (Method Not Allowed) foi corrigido ajustando o endpoint utilizado pelo frontend:
- Endpoint anterior (incorreto): `/api/campaigns/create`
- Endpoint corrigido: `/api/campaigns`

### 2. Implementação do Fluxo OAuth2 com Meta Ads

Foi implementado um fluxo completo de autenticação OAuth2 para conexão com o Meta Ads:
- Botão "Conectar ao Meta Ads" na interface
- Redirecionamento para autorização do Facebook
- Callback para receber o código de autorização
- Troca do código por token de acesso
- Armazenamento seguro do token no banco de dados

### 3. Melhorias na Criação de Campanhas

O fluxo de criação de campanhas foi aprimorado com:
- Upload de imagens/vídeos para anúncios
- Seleção de diferentes objetivos de campanha
- Configurações de público-alvo específicas
- Uso automático do token de acesso armazenado

### 4. Melhorias na Interface

- Removido o botão "Planos" do menu lateral
- Adicionada exibição do plano ativo na página de perfil do usuário

## Como Usar

### Conectar com Meta Ads

1. Faça login no sistema ChefStudio
2. Navegue até a seção de Meta Ads
3. Clique no botão "Conectar ao Meta Ads"
4. Você será redirecionado para a página de autorização do Facebook
5. Autorize o acesso às permissões solicitadas
6. Após autorização, você será redirecionado de volta ao ChefStudio
7. O sistema mostrará uma confirmação de conexão bem-sucedida

### Criar uma Campanha

1. Navegue até a seção de Campanhas
2. Clique em "Criar Nova Campanha"
3. Preencha os detalhes da campanha:
   - Nome da campanha
   - Objetivo (Link Clicks, Conversions, etc.)
   - Orçamento
   - Público-alvo
4. Faça upload de imagens ou vídeos para o anúncio
5. Clique em "Criar Anúncio"
6. O sistema criará a campanha usando sua conta Meta Ads conectada

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

## Contato para Suporte

Se precisar de ajuda adicional, entre em contato com o suporte técnico:
- Email: suporte@chefstudio.com
- WhatsApp: (XX) XXXXX-XXXX
