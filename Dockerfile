FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY . .
# Basic security headers can be added via default.conf if needed; using stock config for now.
