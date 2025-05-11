# Sistema SaaS de Automação de Anúncios Meta Ads (ChefiaStudio)

## Visão Geral

Este projeto implementa um sistema SaaS que permite a donos de restaurantes automatizar a criação e gerenciamento de anúncios no Meta Ads (Facebook/Instagram). O sistema oferece uma interface intuitiva (desenvolvida com React) e um backend (Node.js/Express) para gerenciar usuários, cardápios e campanhas.

**Status Atual:** Frontend e Backend desenvolvidos com funcionalidades **simuladas**. As integrações reais com Meta Ads API, OpenAI, Pagamento e Armazenamento de Imagens precisam ser implementadas substituindo as funções simuladas nos controladores do backend e, possivelmente, ajustando o frontend.

## Estrutura do Projeto

```
meta-ads-automation/
├── backend/                 # Servidor API (Node.js/Express)
│   ├── src/
│   │   ├── config/          # Configurações (vazio por enquanto)
│   │   ├── controllers/     # Controladores da API (auth, menu, ads, meta)
│   │   ├── middleware/      # Middleware (vazio por enquanto, ex: auth)
│   │   ├── models/          # Modelos de dados (User, MenuItem, Campaign)
│   │   ├── routes/          # Rotas da API (auth, menu, ads, meta)
│   │   └── server.js        # Ponto de entrada do servidor Express
│   ├── .env                 # Variáveis de ambiente (ex: PORT, JWT_SECRET)
│   └── package.json         # Dependências do backend
├── frontend/                # Aplicação React (meta-ads-frontend)
│   └── meta-ads-frontend/
│       ├── public/          # Arquivos estáticos
│       ├── src/
│       │   ├── components/  # Componentes React (auth, dashboard)
│       │   ├── lib/         # Serviços e utilitários (api.ts)
│       │   ├── App.tsx      # Componente principal (layout)
│       │   ├── index.css    # Estilos globais (Tailwind)
│       │   └── main.tsx     # Ponto de entrada do frontend (React Router)
│       └── package.json     # Dependências do frontend
├── README.md                # Este arquivo
├── WINDOWS_SETUP.md         # Instruções específicas para Windows
└── package.json             # Scripts gerais (vazio por enquanto)
```

## Como Executar (Simulado)

Consulte o arquivo `WINDOWS_SETUP.md` para instruções detalhadas de execução no ambiente Windows.

**Passos Gerais:**

1.  **Backend:**
    *   Navegue até `backend/`
    *   Instale as dependências: `npm install`
    *   Crie um arquivo `.env` (veja `.env.example` se criado) com `PORT=3001` e `JWT_SECRET=SUA_CHAVE_SECRETA`.
    *   Inicie o servidor: `node src/server.js` (ou use `nodemon` para desenvolvimento)
2.  **Frontend:**
    *   Navegue até `frontend/meta-ads-frontend/`
    *   Instale as dependências: `pnpm install` (ou `npm install`)
    *   Inicie o servidor de desenvolvimento: `pnpm run dev` (ou `npm run dev`)
    *   Acesse o frontend no navegador (geralmente `http://localhost:5173`)

## Próximos Passos (Desenvolvimento Futuro)

*   Implementar middleware de autenticação (`protect`) no backend.
*   Conectar o backend a um banco de dados MongoDB real.
*   Substituir simulações nos controladores do backend por chamadas reais às APIs:
    *   Meta Ads API (OAuth, criação/gerenciamento de campanhas)
    *   OpenAI API (geração de legendas)
    *   Gateway de Pagamento (Stripe, PayPal, etc.)
    *   Serviço de Armazenamento de Imagens (AWS S3, Cloudinary, etc.)
*   Implementar upload de imagens no frontend e backend.
*   Adicionar testes automatizados.
*   Refinar a interface e a experiência do usuário.
*   Preparar para deploy em produção.

