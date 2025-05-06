# Usar uma imagem oficial do Node.js
FROM node:16

# Definir diretório de trabalho
WORKDIR /app

# Copiar o package.json e package-lock.json para dentro do container
COPY backend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar o código-fonte do backend
COPY backend/ .

# Expor a porta em que o backend vai rodar
EXPOSE 3001

# Comando para rodar o servidor do backend
CMD ["npm", "start"]
