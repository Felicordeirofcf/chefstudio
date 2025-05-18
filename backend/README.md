# Configuração do Backend ChefStudio

Este arquivo contém as instruções para configurar e executar o backend do ChefStudio em ambiente de produção.

## Requisitos

- Node.js 18.x ou superior
- MongoDB (local ou remoto)
- Conta no Meta Ads (para integração completa)

## Configuração

1. Configure as variáveis de ambiente no arquivo `.env`:
   - `PORT`: Porta para o servidor (padrão: 3001)
   - `MONGODB_URI`: URI de conexão com o MongoDB
   - `JWT_SECRET`: Chave secreta para geração de tokens JWT
   - `FB_APP_ID`: ID do aplicativo Facebook
   - `FB_APP_SECRET`: Chave secreta do aplicativo Facebook
   - `FACEBOOK_REDIRECT_URI`: URL de redirecionamento após autenticação no Facebook
   - `BASE_URL`: URL base do backend
   - `FRONTEND_URL`: URL do frontend
   - `ALLOWED_ORIGINS`: Origens permitidas para CORS

2. Instale as dependências:
   ```
   npm install
   ```

3. Inicie o servidor:
   ```
   npm start
   ```

## Estrutura de Diretórios

- `controllers/`: Controladores da aplicação
- `routes/`: Rotas da API
- `middleware/`: Middlewares (autenticação, etc.)
- `models/`: Modelos de dados
- `server.js`: Arquivo principal do servidor

## Credenciais de Teste

- Email: teste@chefstudio.com
- Senha: ChefStudio2025

## Notas Importantes

- O backend está configurado para funcionar mesmo sem conexão com MongoDB, ativando automaticamente o modo de simulação
- Para ambiente de produção, recomenda-se configurar um MongoDB real
- A integração com Meta Ads está implementada e pronta para uso
