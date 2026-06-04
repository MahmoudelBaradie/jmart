FROM nginx:alpine

# The nginx:alpine entrypoint auto-processes any file matching
# /etc/nginx/templates/*.template with envsubst, writing the result to
# /etc/nginx/conf.d/<name> at container start. We override that target
# with NGINX_ENVSUBST_OUTPUT_DIR so the full nginx.conf (not a snippet)
# is generated. Variables expanded: API_HOST, ADMIN_HOST, FARMER_HOST,
# DRIVER_HOST. nginx's own $vars are preserved by limiting envsubst to
# the listed names.
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
ENV NGINX_ENVSUBST_FILTER='^(API_HOST|ADMIN_HOST|FARMER_HOST|DRIVER_HOST)$'

EXPOSE 80 443
