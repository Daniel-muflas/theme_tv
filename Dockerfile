# The home screen app for LG webOS, built and tested from a Mac.
#   cli:     LG's webOS CLI (ares-*) with the packaged app, and install-tv to put it on the TV
#   ipk:     only the package, exported with `docker build --target ipk --output dist .`
#   preview: the app served on http://localhost:8080 (sample apps stand in for the TV's)

FROM node:20.18.1-bookworm-slim AS cli
RUN npm install -g @webos-tools/cli@3.2.6 && npm cache clean --force
COPY tools/install-tv.sh /usr/local/bin/install-tv
COPY tools/devmode-session.mjs /usr/local/lib/
WORKDIR /work
COPY app/ ./app/
RUN ares-package --no-minify app -o out && mv out/*.ipk theme-tv.ipk && rm -r out
CMD ["ares-package", "--info", "theme-tv.ipk"]

FROM scratch AS ipk
COPY --from=cli /work/theme-tv.ipk /

FROM nginx:1.27-alpine AS preview
COPY app/ /usr/share/nginx/html/
