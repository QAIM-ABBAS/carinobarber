# Build stage: compile the single page application.
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies first so the layer is cached between code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The browser talks to the API through the same origin (nginx proxies /api),
# so the base URL stays empty in the image.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Runtime stage: nginx serves the built files and forwards /api to the backend.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=10 \
    CMD wget -qO- http://127.0.0.1/api/v1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
