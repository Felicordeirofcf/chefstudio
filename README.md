# ChefStudio - Plataforma de Marketing Digital para Restaurantes

ChefStudio é uma plataforma completa de marketing digital desenvolvida especificamente para restaurantes e estabelecimentos gastronômicos. A plataforma permite que proprietários de restaurantes gerenciem sua presença online, conectem-se com clientes através de redes sociais, criem campanhas publicitárias automatizadas e monitorem o desempenho de suas estratégias de marketing.

## Novidades: Integração com Meta Ads

Agora o ChefStudio conta com integração completa com o Meta Ads (Facebook/Instagram), permitindo:

- **Login automático com Facebook**: Autenticação simplificada para seus clientes
- **Coleta automática de permissões**: Todas as permissões necessárias são solicitadas automaticamente
- **Obtenção do ID da conta de anúncio**: O sistema identifica e armazena automaticamente a conta de anúncio do usuário
- **Métricas reais no dashboard**: Exibição de métricas reais do Meta Ads diretamente no dashboard
- **Número de anúncios**: Visualização do total de anúncios e anúncios ativos

## Funcionalidades Principais

### 1\. Autenticação e Gerenciamento de Usuários

*   **Registro de usuários** com informações do estabelecimento
*   **Login seguro** com JWT (JSON Web Token)
*   **Login com Facebook** para acesso rápido e integração com Meta Ads
*   **Refresh token** para manter sessões ativas
*   **Recuperação de senha** via email
*   **Perfil de usuário** com informações do restaurante

### 2\. Integração com Meta Ads

*   **Conexão OAuth** com Facebook/Instagram
*   **Autorização de contas** de anúncios
*   **Acesso a métricas** de campanhas existentes
*   **Visualização de contas** de anúncios disponíveis
*   **Gerenciamento de permissões** para publicação de conteúdo
*   **Coleta automática** do ID da conta de anúncio

### 3\. Dashboard de Métricas

*   **Visão geral** de métricas de marketing
*   **Gráficos de desempenho** de campanhas
*   **Mapa interativo** de alcance geográfico
*   **Indicadores de performance** (KPIs) em tempo real
*   **Filtros personalizáveis** por período e tipo de campanha
*   **Número de anúncios** ativos e total

### 4\. Gerenciamento de Cardápio

*   **Cadastro de itens** do cardápio
*   **Upload de imagens** dos pratos
*   **Categorização** de produtos
*   **Preços e descrições** detalhadas
*   **Destaque para itens** especiais ou sazonais

### 5\. Campanhas Automatizadas

*   **Criação de campanhas** publicitárias
*   **Segmentação de público** por localização e interesses
*   **Definição de orçamento** e duração
*   **Seleção de objetivos** de marketing
*   **Templates pré-definidos** para diferentes tipos de promoções

## Tecnologias Utilizadas

### Backend
*   Node.js
*   Express.js
*   MongoDB
*   JWT para autenticação
*   Swagger para documentação da API

### Frontend
*   React.js
*   TypeScript
*   Tailwind CSS
*   Shadcn UI
*   Vite

### Infraestrutura
*   Railway para hospedagem do backend
*   Vercel para hospedagem do frontend
*   MongoDB Atlas para banco de dados
*   GitHub para controle de versão

## Instruções de Instalação e Deploy

### Backend
1.  Clone o repositório
2.  Instale as dependências: `npm install`
3.  Configure as variáveis de ambiente no arquivo `.env`:
    ```
    PORT=3001
    MONGODB_URI=sua_string_de_conexao_mongodb
    JWT_SECRET=sua_chave_secreta
    FB_APP_ID=seu_app_id_do_facebook
    FB_APP_SECRET=seu_app_secret_do_facebook
    FACEBOOK_REDIRECT_URI=https://seu-backend.com/api/meta/callback
    BASE_URL=https://seu-backend.com
    FRONTEND_URL=https://seu-frontend.com
    ALLOWED_ORIGINS=https://seu-frontend.com,http://localhost:5173
    ```
4.  Execute o servidor: `npm start`
5.  Acesse a documentação Swagger: `http://localhost:3001/api-docs`

### Frontend
1.  Navegue até a pasta frontend: `cd frontend`
2.  Instale as dependências: `npm install`
3.  Configure as variáveis de ambiente no arquivo `.env`:
    ```
    VITE_API_URL=https://seu-backend.com
    ```
4.  Execute o servidor de desenvolvimento: `npm run dev`
5.  Para build de produção: `npm run build`

## Fluxo de Integração Meta Ads

1. O usuário clica no botão "Conectar Instagram / Facebook" no componente MetaAdsConnection
2. O sistema redireciona para a página de autenticação do Facebook, solicitando as permissões necessárias
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

## Contribuição

Para contribuir com o projeto, siga estas etapas:

1.  Faça um fork do repositório
2.  Crie uma branch para sua feature: `git checkout -b feature/nova-funcionalidade`
3.  Faça commit das alterações: `git commit -m 'Adiciona nova funcionalidade'`
4.  Envie para o branch: `git push origin feature/nova-funcionalidade`
5.  Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Contato

Para mais informações, entre em contato com a equipe do ChefStudio:

*   Email: contato@chefstudio.com.br
*   Website: https://chefstudio.com.br
