from celery import Celery

# Redisをバックエンドに設定
app = Celery(
    'tasks',
    broker='redis://redis:6379/0',  # Redisサービス名に変更
    backend='redis://redis:6379/0',  # Redisサービス名に変更
)

app.conf.task_track_started = True
app.conf.task_always_eager = False
app.conf.task_ignore_result = False
app.conf.result_expires = 3600  # 必要なら有効期限を延長

app.conf.update(
    task_serializer='json',
    accept_content=['json'],  # タスクデータをJSONとして送受信
    result_serializer='json',
    timezone='Asia/Tokyo',
    enable_utc=True,
    result_expires=3600,
)
