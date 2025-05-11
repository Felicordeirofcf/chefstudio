# Instruções de Setup - Windows (VSCode)

Este guia detalha como configurar e executar o projeto **ChefiaStudio (Automação Meta Ads)** no seu ambiente Windows usando o VSCode.

**Status Atual:** O projeto está configurado com um frontend React e um backend Node.js/Express, ambos utilizando **funcionalidades simuladas**. As integrações reais (Meta Ads, OpenAI, Pagamento, MongoDB, etc.) precisam ser implementadas posteriormente.

## Pré-requisitos

Certifique-se de ter os seguintes softwares instalados no seu Windows:

1.  **Node.js:** Inclui npm (Node Package Manager). Baixe em [https://nodejs.org/](https://nodejs.org/)
2.  **pnpm:** (Opcional, mas usado no setup inicial do frontend). Instale via npm: `npm install -g pnpm`
3.  **Git:** Para controle de versão (opcional para apenas rodar, mas recomendado). Baixe em [https://git-scm.com/](https://git-scm.com/)
4.  **VSCode:** Editor de código. Baixe em [https://code.visualstudio.com/](https://code.visualstudio.com/)

## Passos de Configuração

1.  **Descompacte o Projeto:**
    *   Extraia o arquivo `.zip` que você recebeu para uma pasta de sua preferência (ex: `C:\Projetos\meta-ads-automation`).

2.  **Abra no VSCode:**
    *   Abra o VSCode.
    *   Vá em `File > Open Folder...` e selecione a pasta raiz do projeto (`meta-ads-automation`).

3.  **Configure o Backend:**
    *   Abra um terminal integrado no VSCode (`Terminal > New Terminal`).
    *   Navegue até a pasta do backend: `cd backend`
    *   Instale as dependências: `npm install`
    *   Crie um arquivo chamado `.env` dentro da pasta `backend/`.
    *   Adicione o seguinte conteúdo ao arquivo `.env` (você pode usar qualquer chave secreta para a simulação):
        ```env
        PORT=3001
        JWT_SECRET=SUA_CHAVE_SECRETA_SIMULADA_AQUI
        # MONGODB_URI=mongodb://localhost:27017/chefia_studio_db # Descomente se for usar MongoDB local
        ```

4.  **Configure o Frontend:**
    *   Abra **outro** terminal integrado no VSCode (ou use o mesmo, mas navegue para a pasta correta).
    *   Navegue até a pasta do frontend: `cd frontend\meta-ads-frontend` (ou `cd ../frontend/meta-ads-frontend` se estiver vindo do backend).
    *   Instale as dependências: `pnpm install` (ou `npm install` se não quiser usar pnpm).
    *   **Configurar Proxy (Importante):** Para que o frontend (rodando em uma porta como 5173) possa se comunicar com o backend (rodando na porta 3001) usando caminhos relativos como `/api`, precisamos configurar um proxy no servidor de desenvolvimento do frontend. Edite (ou crie se não existir) o arquivo `vite.config.ts` na pasta `frontend/meta-ads-frontend/` e adicione a configuração do servidor:
        ```typescript
        import path from "path"
        import react from "@vitejs/plugin-react"
        import { defineConfig } from "vite"
        
        export default defineConfig({
          plugins: [react()],
          resolve: {
            alias: {
              "@": path.resolve(__dirname, "./src"),
            },
          },
          server: { // Adicione esta seção
            proxy: {
              // Redireciona requisições /api para o backend na porta 3001
              '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                // secure: false, // Descomente se o backend não tiver HTTPS
              }
            }
          }
        })
        ```

## Executando o Sistema (Simulado)

Você precisará de dois terminais abertos no VSCode, um para o backend e outro para o frontend.

1.  **Inicie o Backend:**
    *   No terminal que está na pasta `backend/`.
    *   Execute: `node src/server.js`
    *   Você deverá ver a mensagem `Server running on port 3001` e `MongoDB connection setup is commented out...`.

2.  **Inicie o Frontend:**
    *   No terminal que está na pasta `frontend/meta-ads-frontend/`.
    *   Execute: `pnpm run dev` (ou `npm run dev`)
    *   O terminal mostrará a URL para acessar o frontend (geralmente `http://localhost:5173`).

3.  **Acesse no Navegador:**
    *   Abra seu navegador e acesse a URL fornecida pelo servidor de desenvolvimento do frontend (ex: `http://localhost:5173`).
    *   Você verá a tela de login.

## Testando a Simulação

*   **Login:** Use o email `teste@chefia.studio` e a senha `senha123`.
*   **Navegação:** Clique nos botões para avançar pelas telas (Cadastro -> Conectar Meta -> Dashboard).
*   **Dashboard:** Veja o cardápio simulado e tente criar uma campanha (a criação será simulada no backend).

Lembre-se que esta é uma versão simulada. A interação real com banco de dados e APIs externas precisará ser implementada.
