# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /usr/src/backend

# Copiar o package.json e o package-lock.json para o container
COPY backend/package*.json ./

# Instalar as dependências do backend
RUN npm install

# Copiar o código-fonte do backend para o diretório de trabalho no container
COPY backend /usr/src/backend

# Expor a porta (ajuste conforme a porta usada pelo seu servidor backend)
EXPOSE 3001

# Comando para rodar o servidor backend
CMD ["node", "src/server.js"]
