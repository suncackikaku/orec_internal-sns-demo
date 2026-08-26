# Multi-stage build for React app with Nginx
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# テナントごとに WOFF ID を差し替えられるようにする。
# 未指定なら AuthContext.jsx のフォールバックが使われる。
ARG VITE_WOFF_ID
ENV VITE_WOFF_ID=${VITE_WOFF_ID}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]