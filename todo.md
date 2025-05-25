# Lista de Tarefas - Implementação ChefStudio AI Ads

Este arquivo rastreia o progresso das implementações solicitadas para o projeto ChefStudio.

## Planejamento e Configuração

- [ ] **Analisar Repositório:** Entender a estrutura atual do backend (Node.js/Express) e frontend (React/TypeScript/Vite). (Concluído na análise inicial)
- [X] **Planejar Implementações:** Detalhar os arquivos a serem modificados/criados para cada funcionalidade. (Concluído)
- [ ] **Configurar OpenAI API:**
    - [X] Adicionar dependência `openai` ao `backend/package.json`.
    - [X] Configurar variável de ambiente `OPENAI_API_KEY` no backend (ex: usando `dotenv`).
    - [X] Criar módulo/serviço no backend para interagir com a API OpenAI (modelo `gpt-4`).

## Interface do Usuário (Frontend)

- [X] **Criar Componente de Abas:**
    - [X] Identificar componente atual de criação de anúncios.
    - [X] Implementar estrutura de abas (ex: usando `shadcn/ui` Tabs) na página de criação de anúncios.
    - [X] Mover fluxo atual para a aba "Criar anúncio manualmente".
    - [X] Adicionar placeholder para a aba "Criar anúncio com Inteligência Artificial".
- [ ] **Implementar Aba "Criar anúncio com IA":**
    - [X] Adicionar campo de upload de imagem.
    - [X] Adicionar campo de texto para descrição simples do produto.
    - [X] Adicionar campo numérico/seletor para orçamento semanal.
    - [X] Adicionar área para exibir legenda gerada pela IA.
    - [X] Adicionar botão "Gerar Legenda com IA".
    - [X] Adicionar botão "Publicar Anúncio".

## Integração de APIs (Backend e Frontend)

- [X] **Backend - Geração de Legenda (OpenAI):**
    - [X] Criar endpoint (ex: `POST /api/ai/generate-caption`) que recebe descrição (e opcionalmente imagem).
    - [X] Implementar lógica para chamar o serviço OpenAI e retornar a legenda gerada.
- [X] **Frontend - Chamada para Geração de Legenda:**
    - [X] Implementar chamada ao endpoint `/api/ai/generate-caption` ao clicar no botão "Gerar Legenda com IA".
    - [X] Exibir a legenda retornada na interface para revisão do usuário.
- [X] **Backend - Publicação no Facebook:**
    - [X] Verificar/adicionar dependência do SDK do Facebook.
    - [X] Criar endpoint (ex: `POST /api/facebook/publish-ad`) que recebe imagem, legenda final e orçamento.
    - [X] Implementar lógica para:
        - [X] Fazer upload da imagem e legenda para a página do Facebook (`POST /{page_id}/photos`).
        - [X] Extrair o `post_id` da resposta.
        - [X] Criar um anúncio básico usando a Marketing API (ex: impulsionar post) associado ao `post_id` (usando `object_story_id = page_id_post_id`).
- [X] **Frontend - Chamada para Publicação:**
    - [X] Implementar chamada ao endpoint `/api/facebook/publish-ad` ao clicar no botão "Publicar Anúncio".

## Feedback e Experiência do Usuário

- [X] **Indicadores Visuais:**
    - [X] Adicionar indicadores de carregamento durante chamadas de API (OpenAI, Facebook).
- [X] **Mensagens de Confirmação/Erro:**
    - [X] Exibir mensagens claras de sucesso ou erro para cada etapa (geração de legenda, publicação, criação de anúncio).
- [X] **Revisão da Legenda:** Garantir que a legenda gerada seja exibida claramente antes da publicação.
- [X] **Confirmação Final:** Após a criação bem-sucedida do anúncio, exibir mensagem de confirmação, idealmente com um link para o Gerenciador de Anúncios do Facebook.

## Finalização

- [X] **Validação e Testes:** Testar ambos os fluxos de criação de anúncios (manual e IA) ponta a ponta.
- [X] **Revisão de Código:** Verificar segurança (API Key) e boas práticas.
- [X] **Documentação:** Atualizar README se necessário com instruções de configuração da nova API Key.
- [X] **Entrega:** Enviar código atualizado e relatório final.
