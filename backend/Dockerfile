FROM node:18

WORKDIR /app

COPY package*.json ./

# Instala ferramentas de build (necessárias para bcrypt)
RUN apt-get update && apt-get install -y python3 make g++

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
