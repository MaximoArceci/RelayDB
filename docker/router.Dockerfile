FROM python:3.12-slim

WORKDIR /app

COPY router/ ./

EXPOSE 5432
CMD ["python", "router.py"]
