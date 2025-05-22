# Correção de Rota para Conexão Meta Ads

## Problema Identificado
Foi identificado um erro 404 na rota `/connect-meta` quando o usuário tenta acessar a página de conexão com o Meta Ads após o login.

## Solução Aplicada
A rota `/connect-meta` não estava definida no arquivo de configuração de rotas do React Router. Foi adicionada a rota no arquivo `main.tsx` para apontar para o componente `ConnectMeta` existente.

## Arquivos Modificados
- `frontend/src/main.tsx`: Adicionada a rota `/connect-meta` e também a rota `/meta-callback` para garantir o fluxo completo de autenticação com o Meta Ads.

## Como Aplicar a Correção
1. Substitua o arquivo `frontend/src/main.tsx` pelo arquivo corrigido fornecido
2. Reinicie o servidor de desenvolvimento ou reconstrua a aplicação

## Verificação
Após aplicar a correção, o fluxo de login e redirecionamento para a conexão Meta Ads deve funcionar corretamente, sem erros 404.
