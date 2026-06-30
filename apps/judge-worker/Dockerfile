FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CODEARENA_SANDBOX_MODE=bubblewrap

RUN apt-get update \
    && apt-get install -y --no-install-recommends bubblewrap \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /usr/sbin/nologin judge

WORKDIR /app
COPY apps/judge-worker/ /app/

USER judge

CMD ["python", "worker.py"]
