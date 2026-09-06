FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:5000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm ci
COPY FE ./FE
WORKDIR /app/FE
RUN npx vite build

FROM nginx:1.27-alpine
COPY FE/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/FE/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
