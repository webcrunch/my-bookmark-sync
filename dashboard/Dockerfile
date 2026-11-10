# Bygg: Angular-appen med /bookmarks/ som bas, eftersom den körs på jarllindquist.com/bookmarks
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --base-href /bookmarks/

# Servera: bara de byggda filerna, med nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html
EXPOSE 80
