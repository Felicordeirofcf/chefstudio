# Etapa 1: Usa uma imagem oficial do Node
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência primeiro
COPY package*.json ./

# Instala as dependências dentro do container
RUN npm install

# Copia o restante do código para o container
COPY . .

# Expõe a porta (ajuste conforme seu app)
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "start"]
