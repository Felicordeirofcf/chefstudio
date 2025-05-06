# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o package.json e o package-lock.json para o container
COPY backend/package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o código-fonte do backend (incluindo o arquivo server.js da pasta src)
COPY backend/src /app/src

# Expor a porta do backend
EXPOSE 3001

# Comando para rodar o servidor do backend
CMD ["node", "backend/src/server.js"]
