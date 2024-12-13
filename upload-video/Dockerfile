# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11.4
FROM python:${PYTHON_VERSION}-slim AS base

# Evitar errores de compilación relacionados con la caché de pip y permisos
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Crear usuario no root
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt y usar caché para instalar dependencias de Python
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install -r requirements.txt

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de la aplicación
EXPOSE 5002

# Definir el comando predeterminado
CMD ["gunicorn", "-w", "8", "-b", "0.0.0.0:5002", "--timeout", "600", "server:app"]
