# Documentação de Integração do Facebook/Meta Ads com ChefStudio

## Visão Geral

Esta documentação descreve a implementação da integração do Facebook/Meta Ads com o sistema ChefStudio, permitindo:

1. Login automático com Facebook
2. Coleta automática de permissões necessárias
3. Obtenção do ID da conta de anúncio do usuário
4. Exibição de métricas reais do Meta Ads no dashboard
5. Exibição do número de anúncios no dashboard

## Arquivos Implementados

### Backend

- **routes/meta.js**: Implementação completa das rotas de integração com Meta Ads
  - `/api/meta/login`: Inicia o processo de autenticação com Facebook
  - `/api/meta/callback`: Processa o retorno do OAuth
  - `/api/meta/connect`: Conecta a conta do usuário e obtém o ID da conta de anúncio
  - `/api/meta/adaccounts`: Obtém as contas de anúncio do usuário
  - `/api/meta/metrics`: Obtém métricas reais da conta de anúncio

### Frontend

- **components/FacebookLoginButton.jsx**: Componente para login com Facebook
- **components/MetaAdsConnection.jsx**: Componente para conexão/desconexão com Meta Ads
- **components/DashboardMetrics.jsx**: Componente para exibição de métricas no dashboard
- **components/MetaCallback.jsx**: Componente para processar o retorno do OAuth

## Fluxo de Autenticação e Coleta de Dados

1. O usuário clica no botão "Conectar Instagram / Facebook" no componente MetaAdsConnection
2. O sistema redireciona para a página de autenticação do Facebook, solicitando as permissões:
   - `ads_management`: Para gerenciar anúncios
   - `ads_read`: Para ler métricas de anúncios
   - `business_management`: Para acessar contas de negócio
   - Outras permissões complementares
3. Após autorização, o Facebook redireciona para o callback do backend
4. O backend processa o código de autorização e redireciona para o frontend
5. O componente MetaCallback envia o código para o backend via POST /api/meta/connect
6. O backend:
   - Troca o código por um token de acesso
   - Obtém informações do usuário do Facebook
   - Obtém as contas de anúncio disponíveis
   - Armazena o ID da primeira conta de anúncio
   - Salva todas as informações no perfil do usuário
7. O frontend atualiza o localStorage com os dados do usuário
8. O dashboard exibe as métricas reais obtidas via API do Meta Ads

## Métricas Exibidas no Dashboard

- **Métrica 1**: Impressões totais
- **Métrica 2**: Investimento total (R$)
- **Métrica 3**: Cliques nos anúncios
- **Métrica 4**: Número total de anúncios (com indicação de anúncios ativos)

## Permissões Necessárias

- `ads_management`: Permite gerenciar anúncios e campanhas
- `ads_read`: Permite ler métricas e dados de anúncios
- `business_management`: Permite acessar contas de negócio
- `instagram_basic`: Permite acesso básico ao Instagram
- `instagram_content_publish`: Permite publicar conteúdo no Instagram
- `pages_read_engagement`: Permite ler engajamento de páginas
- `pages_show_list`: Permite listar páginas do usuário

## Configuração de Variáveis de Ambiente

### Backend (.env)
```
FB_APP_ID=seu_app_id_do_facebook
FB_APP_SECRET=seu_app_secret_do_facebook
FACEBOOK_REDIRECT_URI=https://seu-backend.com/api/meta/callback
FRONTEND_URL=https://seu-frontend.com
```

### Frontend (.env)
```
VITE_API_URL=https://seu-backend.com
```

## Tratamento de Erros e Fallbacks

- Se o usuário não estiver conectado ao Meta Ads, o dashboard exibirá dados simulados
- Se ocorrer um erro na API do Facebook, o sistema tentará usar dados em cache ou simulados
- Mensagens de erro são exibidas de forma amigável para o usuário
- O sistema tenta reconectar automaticamente se o token expirar

## Considerações de Segurança

- Tokens de acesso são armazenados de forma segura no banco de dados
- O sistema usa o state parameter no OAuth para prevenir ataques CSRF
- As permissões solicitadas são apenas as necessárias para o funcionamento
- O frontend não tem acesso direto aos tokens do Facebook, apenas ao token JWT do sistema

## Próximos Passos Recomendados

1. Implementar seleção de conta de anúncio quando o usuário tiver múltiplas contas
2. Adicionar mais métricas e visualizações no dashboard
3. Implementar histórico de métricas para comparação de períodos
4. Adicionar funcionalidade de criação de anúncios diretamente do dashboard
