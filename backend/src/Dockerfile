# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /src/app

# Copiar o package.json e o package-lock.json para o container
COPY backend/package*.json ./

# Instalar as dependências do backend
RUN npm install

# Copiar todo o código-fonte do backend para o diretório de trabalho no container
COPY backend/ /src/app/

# Expor a porta do backend
EXPOSE 3001

# Comando para rodar o servidor backend
CMD ["node", "src/server.js"]
