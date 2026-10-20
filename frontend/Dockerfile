FROM node:24.11.1

WORKDIR /app
COPY . .

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]