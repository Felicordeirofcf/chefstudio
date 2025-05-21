# Instruções de Implementação - Integração Meta Ads

Este documento contém instruções para implementar a integração com Meta Ads no ChefStudio, permitindo:
1. Busca automática do ID da conta de anúncio ao fazer login com Facebook
2. Seleção de publicações do Facebook para promover
3. Exibição de métricas reais do Meta Ads no dashboard

## Estrutura de Arquivos

```
chefstudio_integracao/
├── backend/
│   ├── models/
│   │   └── user.js              # Modelo de usuário com campos para Meta Ads
│   └── routes/
│       └── meta.js              # Rotas para integração com Meta Ads
└── frontend/
    └── src/
        └── components/
            ├── CampanhaManual.jsx       # Componente de criação de campanha
            ├── FacebookPostSelector.jsx  # Seletor de publicações do Facebook
            └── MetaAdsMetrics.jsx        # Componente de métricas do Meta Ads
```

## Instruções de Instalação

1. Copie os arquivos para as respectivas pastas do seu projeto
2. Instale as dependências necessárias:
   ```
   npm install axios --save
   ```

3. Configure as variáveis de ambiente no arquivo `.env` do backend:
   ```
   FACEBOOK_APP_ID=seu_app_id_aqui
   FACEBOOK_APP_SECRET=seu_app_secret_aqui
   ```

4. Importe e utilize os componentes conforme necessário no seu dashboard

## Configuração do Facebook Developer

1. Certifique-se de que seu aplicativo Facebook tenha as seguintes permissões:
   - `email`
   - `public_profile`
   - `ads_management`
   - `ads_read`
   - `pages_read_engagement`

2. Configure a URL de callback no Facebook Developer:
   ```
   https://seu-dominio.com/auth/facebook/callback
   ```

## Observações Importantes

- Esta implementação mantém toda a estrutura atual do sistema intacta
- Apenas as funcionalidades solicitadas foram implementadas
- O menu lateral e outros elementos permanecem inalterados
- As métricas reais do Meta Ads são exibidas no dashboard
- O ID da conta de anúncio é buscado automaticamente ao fazer login com Facebook
