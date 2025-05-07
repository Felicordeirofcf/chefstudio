FROM node:16

# Define a pasta de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos de dependência primeiro
COPY backend/package*.json ./

# Instala as dependências
RUN npm install

# Copia todo o restante do backend
COPY backend/ .

# Expõe a porta usada pelo backend
EXPOSE 3001

# Inicia o servidor
CMD ["node", "server.js"]
