#Backend
FROM langchain/langchain as builder
WORKDIR /backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/. .

#Frontend
FROM --platform=$BUILDPLATFORM node:20.9.0-alpine3.18 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build

FROM langchain/langchain
LABEL org.opencontainers.image.title="OpenAI from Scratch" \
    org.opencontainers.image.description="My awesome Docker extension" \
    org.opencontainers.image.vendor="Awesome Inc." \
    com.docker.desktop.extension.api.version="0.3.4" \
    com.docker.extension.screenshots="" \
    com.docker.desktop.extension.icon="" \
    com.docker.extension.detailed-description="" \
    com.docker.extension.publisher-url="" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.categories="" \
    com.docker.extension.changelog=""

COPY --from=builder /backend backend
COPY docker-compose.yaml .
COPY metadata.json .
COPY bot.svg .
COPY --from=client-builder /ui/build ui

WORKDIR /backend
RUN pip install --no-cache-dir -r requirements.txt
WORKDIR /

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

#fix some ssl errors
RUN python -m pip install --no-cache-dir --upgrade certifi

# Start Gunicorn with UNIX socket
CMD ["gunicorn", "--bind", "unix:/run/guest-services/backend5.sock", "backend.loader:app", "-t 12000"]

