FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN useradd --create-home --shell /usr/sbin/nologin judge

WORKDIR /app
COPY apps/judge-worker/ /app/

USER judge

CMD ["python", "worker.py"]

