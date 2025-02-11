FROM node:20-alpine

RUN apk update && apk add --no-cache git ffmpeg

WORKDIR /sparky/xbotmd

RUN git clone https://github.com/ruemods/hmmm . 

RUN git config --global --add safe.directory /sparky/xbotmd

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . . 

EXPOSE 8080

CMD ["npm", "start"]
