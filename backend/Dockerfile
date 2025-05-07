# Usa imagem base do Node.js 16 com suporte a build de nativos
FROM node:16

# Instala dependências do sistema para build de módulos nativos
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (melhor cache)
COPY package*.json ./

# Instala as dependências dentro do container
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Expõe a porta do backend
EXPOSE 3001

# Comando de inicialização
CMD ["node", "server.js"]
