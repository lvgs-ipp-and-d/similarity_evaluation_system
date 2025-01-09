FROM python:3.9-slim

WORKDIR /app

COPY ./backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install -y curl

COPY . .

WORKDIR /app/draft

CMD ["uvicorn", "draft:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]