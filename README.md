# Instruções de Uso - ChefStudio

Este documento contém instruções para instalar, configurar e executar o ChefStudio.

## Requisitos

- Node.js 16.x ou superior
- NPM 7.x ou superior
- MongoDB (remoto ou local)

## Estrutura do Projeto

O projeto está dividido em duas partes principais:

- `frontend`: Interface de usuário construída com React e Vite
- `backend`: API RESTful construída com Express e MongoDB

## Instalação

### Backend

1. Navegue até a pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - O arquivo `.env` já está configurado para o ambiente de produção
   - Para desenvolvimento local, ajuste as variáveis conforme necessário

4. Inicie o servidor:
```bash
npm start
```

O servidor estará disponível em `http://localhost:3001`.

### Frontend

1. Navegue até a pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - O arquivo `.env` já está configurado para apontar para o backend em produção
   - Para desenvolvimento local, crie um arquivo `.env.local` com:
     ```
     VITE_API_URL=http://localhost:3001
     ```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

## Deploy

### Backend

Para fazer deploy do backend:

1. Certifique-se de que todas as variáveis de ambiente estão configuradas corretamente
2. Faça o deploy para sua plataforma preferida (Railway, Heroku, etc.)

### Frontend

Para fazer build do frontend para produção:

```bash
cd frontend
npm run build
```

Os arquivos de build estarão na pasta `dist` e podem ser hospedados em qualquer serviço de hospedagem estática.

## Correções Implementadas

1. Configuração de CORS universal para permitir acesso de qualquer origem
2. Ajustes nas variáveis de ambiente para facilitar a integração
3. Limpeza de arquivos e pastas desnecessários

## Funcionalidades Principais

- Autenticação de usuários (login/registro)
- Conexão com Meta Ads
- Dashboard com métricas
- Gerenciamento de perfil

## Suporte

Para suporte ou dúvidas, entre em contato com o desenvolvedor.
