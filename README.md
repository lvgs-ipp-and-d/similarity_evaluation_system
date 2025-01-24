# similarity_evaluation_system

プリズマについて： 1.スキーマ編集: schema.prisma 内でテーブルやフィールドを定義 2.マイグレーション作成:
npx prisma migrate dev --name init
3.Prisma Client 生成
npx prisma generate

# リクエスト例

POST: /group
"""
curl -X POST "http://localhost:8000/group" \
 -H "Content-Type: application/json" \
 -d '{
"division_name": "レバテック",
"group_name": "グループ A"
}'
"""
レスポンス：{"message":"正常にグループを登録しました","group_id":2}

POST: /group/process
"""
curl -X POST "http://localhost:8000/group/process" \
 -F "group_id=2" \
 -F "group_name=グループ A" \
 -F "division_name=レバテック" \
 -F "file=@/Users/issei.hosoda/Documents/similarity_evaluation_system/similarity_evaluation_system/draft/test-data/test-group-data.json"
"""

curl -X POST "http://localhost:8000/group/process" \
 -F "group_id=2" \
 -F "group_name=グループ A" \
 -F "division_name=レバテック" \
 -F "files=@/Users/issei.hosoda/Documents/similarity_evaluation_system/similarity_evaluation_system/draft/test-data/test-group-data.json" \
 -F "files=@/Users/issei.hosoda/Documents/similarity_evaluation_system/similarity_evaluation_system/draft/test-data/test-group-data.json"

---

以下に、Redis や実行ステータスを確認するためのコマンドを整理しました。

---

## **Redis 関連の確認コマンド**

### **1. Redis が稼働しているか確認**

Docker コンテナとして起動している場合、以下で確認します。

```bash
docker compose ps
```

- `redis_container` が `Up` 状態であることを確認します。

---

### **2. Redis への接続確認**

Redis が正しく応答しているか確認します。

```bash
docker compose exec redis redis-cli ping
```

- `PONG` が返れば正常です。

---

### **3. Redis 内のキー一覧確認**

現在 Redis に保存されているキーを確認します。

```bash
docker compose exec redis redis-cli keys '*'
```

- Celery のタスク関連のキーは通常 `celery-task-meta-<task_id>` のような形式になります。

---

### **4. Redis 内の特定キーの値確認**

タスクの結果を含むキーが存在する場合、その値を確認します。

```bash
docker compose exec redis redis-cli get celery-task-meta-<task_id>
```

- 値が取得できればタスク結果が保存されています。

---

### **5. Redis の情報全体を確認**

Redis の状態や構成情報を確認します。

```bash
docker compose exec redis redis-cli info
```

- `Memory` や `Clients` セクションで使用状況を確認できます。

---

## **Celery タスクの状態確認コマンド**

### **1. 特定タスクの状態確認 (FastAPI エンドポイント)**

タスク ID を指定して状態を確認します。

```bash
curl -X GET "http://localhost:8000/task/status/<task_id>"
```

- 期待するレスポンス:
  - `{"status":"SUCCESS","result":{...}}`
  - `{"status":"PENDING","message":"タスクがキューにあります"}`

---

### **2. Celery Worker のログ確認**

Worker のログをリアルタイムで確認します。

```bash
docker compose logs -f celery
```

- タスクの処理開始や完了のログが記録されています。

---

### **3. Celery タスクの状態確認 (Worker 内部から実行)**

Worker が実行中のタスクや状態を確認します。

```bash
docker compose exec celery bash
celery -A tasks inspect active
```

- 実行中のタスクが表示されます。

---

## **Redis と Celery タスクの統合確認**

### **タスクのフロー**

1. **タスクを登録**:

   ```bash
   curl -X POST http://localhost:8000/group/process \
     -H "Content-Type: multipart/form-data" \
     -F "files=@<file_path>" \
     -F "group_id=1" \
     -F "group_name=test_group" \
     -F "division_name=sales"
   ```

   - `task_id` が返される。

2. **タスクの状態を確認**:

   ```bash
   curl -X GET "http://localhost:8000/task/status/<task_id>"
   ```

3. **Redis 内のキーを確認**:

   ```bash
   docker compose exec redis redis-cli keys '*'
   ```

4. **タスク結果を Redis から確認**:
   ```bash
   docker compose exec redis redis-cli get celery-task-meta-<task_id>
   ```

---

不明点や追加で確認したいことがあれば、お気軽にどうぞ！

---

- 類似度グルーピング実行

  ```bash
  curl -X POST http://localhost:8000/group/process \
  -H "Content-Type: multipart/form-data" \
  -F "files=@/Users/issei.hosoda/Documents/similarity_evaluation_system/similarity_evaluation_system/draft/test-data/test-group-data.json" \
  -F "group_name=Group_A" \
  -F "division_name=Issei_Division" | jq
  ```

- グルーピング進捗取得

  ```bash
  curl -X GET http://localhost:8000/tasks | jq
  ```

- 実行済グループ取得

  ```bash
  curl -X GET http://localhost:8000/tasks/completed | jq

  ```

- 実行済グループのダウンロード

  ```bash
  curl -X GET http://localhost:8000/group/1/download -H "Accept: application/json" -o "result.json"

  ```

- 類似度検索実行
  ```bash
  curl -X POST http://localhost:8000/search/process \
  -F "files=@/Users/issei.hosoda/Documents/similarity_evaluation_system/similarity_evaluation_system/draft/test-data/query.json;type=application/json" \
  -F "group_id=1" \
  -F "group_name=SampleGroup" \
  -F "division_name=SampleDivision" | jq
  ```
