FROM node:20.12.2

RUN mkdir -p /home/notificaciones

COPY . /home/notificaciones

EXPOSE 8888

CMD ["node", "/home/notificaciones/main.js"]