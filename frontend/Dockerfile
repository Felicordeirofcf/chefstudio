# Usar uma imagem oficial do Node.js
FROM node:16

# Definir diretório de trabalho
WORKDIR /app

# Copiar o package.json e package-lock.json para dentro do container
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar o código-fonte do frontend
COPY frontend/ .

# Rodar o build do frontend
RUN npm run build

# Expor a porta onde o frontend vai rodar (se for um app estático, pode ser a porta 80)
EXPOSE 3000

# Comando para rodar o frontend
CMD ["npm", "start"]
