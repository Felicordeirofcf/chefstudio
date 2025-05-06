# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o package.json e o package-lock.json para o container
COPY backend/package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o código-fonte do backend (incluindo o código fonte e scripts de build)
COPY backend/src /app/src
COPY frontend /app/frontend

# Expor a porta do backend
EXPOSE 3001

# Rodar o build
RUN npm run build

# Comando para rodar o servidor
CMD ["node", "src/server.js"]
