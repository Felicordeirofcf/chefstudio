# Usar uma imagem oficial do Node.js
FROM node:16

# Definir o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copiar o package.json e o package-lock.json para o container
COPY frontend/package*.json ./

# Instalar as dependências
RUN npm install

# Copiar todo o código-fonte do frontend para o diretório de trabalho no container
COPY frontend /usr/src/app

# Expor a porta
EXPOSE 3000

# Comando para rodar o servidor do frontend
CMD ["npm", "run", "dev"]
