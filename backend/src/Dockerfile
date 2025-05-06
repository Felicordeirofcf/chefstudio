# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o package.json para o container
COPY backend/package*.json ./

# Instalar as dependências do backend
RUN npm install

# Copiar o código-fonte do backend
COPY backend/ .

# Expor a porta do backend
EXPOSE 3001

# Rodar o servidor do backend
CMD ["npm", "start"]
