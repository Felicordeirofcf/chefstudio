# ChefStudio - Correção do Fluxo de Anúncios Meta

## Tarefas

### Backend
- [x] Corrigir extração do post_id a partir de diferentes formatos de URL do Facebook
- [x] Implementar validação da existência e visibilidade da publicação
- [x] Garantir uso correto do object_story_id no payload enviado ao Meta Ads
- [x] Corrigir validação do campo objective para aceitar valores válidos
- [x] Melhorar tratamento de erros e logs para diagnóstico

### Frontend
- [x] Remover completamente a opção de upload de imagem do formulário
- [x] Ajustar formulário para aceitar apenas anúncios com publicação existente
- [x] Organizar campos conforme solicitado (obrigatórios e opcionais)
- [x] Pré-definir objetivo da campanha como POST_ENGAGEMENT ou LINK_CLICKS
- [x] Testar fluxo com vários formatos de URL do Facebook e Instagram

### Entrega
- [ ] Compactar arquivos modificados mantendo estrutura de pastas
- [ ] Enviar arquivos ao usuário
