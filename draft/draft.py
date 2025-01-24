# ライブラリのインポート
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datasketch import MinHash, MinHashLSH
from contextlib import asynccontextmanager
# from google.auth.transport import requests
from psycopg2.extras import RealDictCursor
# from celery.result import AsyncResult 
# from google.oauth2 import id_token
from pydantic import BaseModel
from dotenv import load_dotenv
from celery_app import app
from typing import List
import numpy as np
import psycopg2
import logging
import json
import asyncpg
import time
import os

# .envファイルの読み込み
load_dotenv()

# ログの設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# リクエストボディの定義
class Token(BaseModel): # トークンリクエストボディ
    token: str

class GroupCreateRequest(BaseModel): # グループ登録リクエストボディ
    division_name: str
    group_name: str

class GroupProcessRequest(BaseModel): # グループ処理リクエストボディ
    group_id: int
    group_name: str

"""
共通処理
"""
# 再帰的に値を取得してリストに結合する関数
def extract_values(data):
    values = []  # 値を格納するリスト
    if isinstance(data, dict):  # 辞書の場合
        for value in data.values():
            if isinstance(value, (dict, list)):
                values.extend(extract_values(value))
            else:
                values.append(value)
    elif isinstance(data, list):  # リストの場合
        for item in data:
            if isinstance(item, (dict, list)):
                values.extend(extract_values(item))
            else:
                values.append(item)
    else:
        values.append(data)  # 単純な値の場合
    return values

# カラム結合後のn-gramトークン化
def tokenize_combined_data(data, n=2):
    combined_data = " ".join(map(str, extract_values(data)))  # 空白を保持
    tokens = [combined_data[i:i+n] for i in range(len(combined_data) - n + 1)]
    # logger.info(f"トークン化結果: {tokens}")
    return tokens

# 類似度計算
def calculate_similarity(query_doc, db_vectors):
    query_minhash = MinHash(num_perm=num_perm)
    query_tokens = tokenize_combined_data(query_doc)
    
    for token in query_tokens:
        query_minhash.update(token.encode("utf-8"))
    query_vector = np.array(query_minhash.hashvalues)
    
    # コサイン類似度計算
    def cosine_similarity(v1, v2):
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    
    scores = []
    for db_id, db_vectors in db_vectors:
        similarity = cosine_similarity(query_vector, np.array(db_vectors))
        scores.append((db_id, similarity))
    return sorted(scores, key=lambda x: x[1], reverse=True)

num_perm = 128 # MinHashLSHのハッシュ数
lsh = MinHashLSH(threshold=0.6, num_perm=num_perm) # MinHashLSHオブジェクト

"""
データベース接続
"""
def get_db():
    conn =  psycopg2.connect(
        host        = "db",
        port        = "5432",
        dbname      = "postgres_vector_db",
        user        = "user",
        password    = "password"
    )
    try:
        yield conn
    finally:
        conn.close()

"""
テーブル定義
"""
async def initialize_db(conn):
    try:
        # 1. エクステンションの作成
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        # 2. usersテーブルの作成
        await conn.execute(
            """
            DROP TABLE IF EXISTS users CASCADE;
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(255) PRIMARY KEY,
                user_name VARCHAR(255),
                email_address VARCHAR(255),
                password VARCHAR(255),
                division_name VARCHAR(255),
                login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 3. groupsテーブルの作成
        await conn.execute(
            """
            DROP TABLE IF EXISTS groups CASCADE;
            CREATE TABLE IF NOT EXISTS groups (
                group_id SERIAL PRIMARY KEY,
                group_name VARCHAR(255),
                grouped_data JSONB,
                created_at TIMESTAMP DEFAULT timezone('Asia/Tokyo', now()),
                division_name VARCHAR(255),
                path VARCHAR(255)
            );
            """
        )

        # 4. upload_filesテーブルの作成
        await conn.execute(
            """
            DROP TABLE IF EXISTS upload_files CASCADE;
            CREATE TABLE IF NOT EXISTS upload_files (
                file_id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES groups(group_id),
                file_name VARCHAR(255),
                file_size INTEGER
            );
            """
        )

        # 5. elements_vectorsテーブルの作成
        await conn.execute(
            """
            DROP TABLE IF EXISTS elements_vectors CASCADE;
            CREATE TABLE IF NOT EXISTS elements_vectors (
                vector_id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES groups(group_id),
                vector_data vector
            );
            """
        )

        # 6. elements_textsテーブルの作成
        await conn.execute(
            """
            DROP TABLE IF EXISTS elements_texts CASCADE;
            CREATE TABLE IF NOT EXISTS elements_texts (
                text_id SERIAL PRIMARY KEY,
                vector_id INTEGER REFERENCES elements_vectors(vector_id),
                text_data JSONB,
                group_id INTEGER REFERENCES groups(group_id)
            );
            """
        )

        logger.info("データベースの初期化が完了しました")

    except Exception as error:
        logger.exception(f"データベースの初期化中にエラーが発生しました: {error}")
        raise
            
# アプリケーション起動時にデータベースを初期化
@asynccontextmanager
async def lifespan(app):
    conn = await asyncpg.connect(
        host        = "db",
        port        = "5432",
        database    = "postgres_vector_db",
        user        = "user",
        password    = "password"
    )
    try:
        await initialize_db(conn)
        yield
    finally:
        await conn.close()

# FastAPIのインスタンスを作成
app = FastAPI(lifespan=lifespan)

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# グルーピング処理用エンドポイント（POST: /group/process）※バックグランド実行
@app.post("/group/process")
async def process_group(
    files: List[UploadFile] = File(...),
    group_name: str = Form(...),
    division_name: str = Form(...),
    conn = Depends(get_db)
    ):
    
    # データベースに接続
    cur = conn.cursor()
    
    from tasks import process_group_task
    
    # レスポンス用のデータをまとめるリスト
    data_list = []
    
    # レスポンス用のファイル情報をまとめるリスト
    file_info_list = []

    for file in files:
        logger.info(f"ファイル {file.filename} の処理を開始します。")
        
        if file.content_type not in ["application/json", "application/octet-stream"]:
            logger.warning(f"ファイル形式が正しくありません: {file.content_type}")
            raise HTTPException(status_code=400, detail=f"ファイル形式が正しくありません: {file.content_type}")
        
        try:
            content = await file.read()  # ファイルの読み込み
            file_size = len(content)
            json_data = json.loads(content)  # JSONデータの読み込み

            # JSONデータがリスト形式であるかを確認
            if isinstance(json_data, list):
                for item in json_data:
                    # ファイル情報の取得
                    data_list.append({
                        "file_name": file.filename,
                        "file_data": item
                    })
            else:
                data_list.append({
                    "file_name": file.filename,
                    "file_data": json_data
                })

            # ---- ここでレスポンス用にファイル情報を記録 ----
            file_info_list.append({
                "file_name": file.filename,
                "file_size": file_size
            })

            logger.info(f"ファイル {file.filename} の読み込みに成功しました。")
        except json.JSONDecodeError:
            logger.error(f"ファイルの読み込みに失敗しました: {file.filename}")
            raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {file.filename}")

    # ループの外で確認する
    if not data_list:
        logger.warning("アップロードされたファイルがありません。")
        raise HTTPException(status_code=400, detail="アップロードされたファイルがありません。")
    
    task = process_group_task.apply_async(
        args=(data_list, group_name, division_name, file_info_list)
    )

    # レスポンス返却: file_info_listをそのまま"files"に
    return {
        "message": f"タスクがキューに追加されました",
        "task_id": task.id,
        "group_name": group_name,
        "files": file_info_list
    }

# 実行中のタスク一覧を取得するエンドポイント（GET: /tasks）
@app.get("/tasks")
async def list_tasks():
    try:
        from redis import Redis
        from celery.result import AsyncResult

        redis_client = Redis(host="redis", port=6379, decode_responses=True)
        task_keys = redis_client.keys("celery-task-meta-*")

        if not task_keys:
            return {"message": "現在処理中のタスクはありません。タスクが追加されると自動で更新されます。"}

        tasks_list = []
        for task_key in task_keys:
            try:
                task_id = task_key.split("celery-task-meta-")[1]
                result = AsyncResult(task_id)

                group_name = None
                if result.state == "SUCCESS" and result.result:
                    group_name = result.result.get("group_name", "未設定")
                elif result.state in ["PENDING", "STARTED"]:
                    group_name = "処理中"

                tasks_list.append({
                    "id": task_id,
                    "status": result.state,
                    "group_id": result.result.get("group_id", "未設定") if result.state == "SUCCESS" else "未設定",
                    "group_name": group_name,
                    "files": result.result.get("file_info", []) if result.state == "SUCCESS" else [],
                    # "result": result.result if result.state == "SUCCESS" else None
                })

            except Exception as e:
                logger.error(f"タスク {task_key} の処理中にエラー: {e}")
                continue

        # ファイルサイズ情報
        logger.info(f"タスク一覧: {tasks_list}")
        return {"実行中タスク一覧": tasks_list}

    except Exception as e:
        logger.error(f"タスク一覧の取得に失敗しました: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"タスク一覧の取得に失敗しました: {str(e)}")

# 実行済み（完了）タスク一覧を取得するエンドポイント（GET: /tasks/completed）※ここはDBから取得すればよさそう
@app.get("/tasks/completed")
async def list_completed_tasks():
    try:
        from redis import Redis
        from celery.result import AsyncResult

        redis_client = Redis(host="redis", port=6379, decode_responses=True)
        task_keys = redis_client.keys("celery-task-meta-*")

        if not task_keys:
            return {"message": "完了したタスクはありません。"}

        tasks_list = []
        for task_key in task_keys:
            try:
                task_id = task_key.split("celery-task-meta-")[1]
                result = AsyncResult(task_id)

                # ここでは "SUCCESS" のみを「完了」と判断
                if result.state == "SUCCESS" and result.result:
                    group_name = result.result.get("group_name", "未設定")
                    
                    # 必要に応じて、ファイル情報を取得
                    file_info = result.result.get("file_info", [])

                    tasks_list.append({
                        "id": task_id,
                        "group_id": result.result.get("group_id", "未設定"),
                        "group_name": group_name,
                        "created_at": result.result.get("created_at", "未設定"),
                        "files": file_info
                    })

            except Exception as e:
                logger.error(f"タスク {task_key} の処理中にエラー: {e}")
                continue

        # ログ出力
        logger.info(f"完了タスク一覧: {tasks_list}")

        if not tasks_list:
            return {
                "tasks": [],
                "message": "完了したタスクはありません。"
            }

        return {"実行済タスク一覧": tasks_list}

    except Exception as e:
        logger.error(f"タスク一覧（完了）の取得に失敗しました: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"タスク一覧（完了）の取得に失敗しました: {str(e)}")

# データベースからグループを削除するエンドポイント（DELETE: /group/{group_id}）
@app.delete("/group/{group_id}")
async def delete_group(
    group_id: int,
    conn = Depends(get_db)
):
    cur = conn.cursor()
    try:
        print(f"削除リクエストを受信: group_id={group_id}")

        # 削除対象のグループが存在するか確認
        cur.execute(
            "SELECT group_id FROM groups WHERE group_id = %s",
            (group_id,)
        )
        group_exists = cur.fetchone()
        print(f"クエリ結果: {group_exists}")

        if not group_exists:
            raise HTTPException(status_code=404, detail="削除対象のグループが見つかりません")
        
        # Filesテーブルから該当グループのファイルを削除
        cur.execute(
            "DELETE FROM upload_files WHERE group_id = %s",
            (group_id,)
        )

        # Groupsテーブルから該当グループを削除
        cur.execute(
            "DELETE FROM groups WHERE group_id = %s",
            (group_id,)
        )
        conn.commit()
        print(f"グループ {group_id} を削除しました")

        return {"message": "グループを削除しました"}
    except Exception as error:
        print(f"削除中にエラー発生: {error}")
        raise HTTPException(status_code=500, detail="グループの削除に失敗しました")
    finally:
        cur.close()

# グルーピング結果ダウンロード用エンドポイント（GET: /group/download）
@app.get("/group/{group_id}/download", response_class=JSONResponse)
def download_group(group_id: int, conn=Depends(get_db)):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # group_id に一致するデータを取得
        # ▼ 'group_data' ではなく 'grouped_data' をSELECTする
        cur.execute(
            "SELECT grouped_data FROM groups WHERE group_id = %s",
            (group_id,)
        )
        result = cur.fetchone()

        # データが存在しない場合
        if not result or not result["grouped_data"]:
            raise HTTPException(status_code=404, detail="指定されたグループが見つかりません")

        # JSON形式でデータを返却
        return JSONResponse(
            content=result["grouped_data"],
            headers={
                "Content-Disposition": f"attachment; filename=group_{group_id}.json"
            }
        )
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(
            status_code=500,
            detail="グループデータの取得に失敗しました"
        )
    finally:
        cur.close()
        conn.close()


"""
サーチ処理
"""
# アップロードファイルの処理を関数化
async def process_upload_files(files: List[UploadFile]) -> List[dict]:
    data_list = []
    for file in files:
        logger.info(f"ファイル {file.filename} の処理を開始します。")
        if file.content_type != "application/json":
            logger.warning(f"許可されていないファイル形式です: {file.content_type}")
            raise HTTPException(status_code=400, detail=f"許可されていないファイル形式です: {file.content_type}")
        
        try:
            content = await file.read()
            json_data = json.loads(content)

            if isinstance(json_data, list):
                for item in json_data:
                    data_list.append({"filename": file.filename, "file_data": item})
            elif isinstance(json_data, dict):
                data_list.append({"filename": file.filename, "file_data": json_data})
            else:
                data_list.append({"filename": file.filename, "file_data": json_data})

            logger.info(f"ファイル {file.filename} の読み込みに成功しました。")
        except json.JSONDecodeError:
            logger.error(f"ファイルの読み込みに失敗しました: {file.filename}")
            raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {file.filename}")
    
    return data_list


# サーチ用エンドポイント
@app.post("/search/process")
async def process_search(
    files: List[UploadFile] = File(...),
    group_id: int = Form(...),
    conn = Depends(get_db)
):
    start = time.perf_counter()
    
    try:
        logger.info("サーチ処理を開始します。")
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 修正後のクエリ：elements_vectors と elements_texts を結合
            query = f"""
                SELECT v.vector_id, v.vector_data, t.text_data
                FROM elements_vectors v
                JOIN elements_texts t ON v.vector_id = t.vector_id
                WHERE v.group_id = %s;
            """
            logger.debug(f"Executing query: {query} with group_id={group_id}")
            cur.execute(query, (group_id,))
            db_data_raw = cur.fetchall()
        
        if not db_data_raw:
            logger.warning(f"指定されたグループID {group_id} に対応するデータが存在しません。")
            raise HTTPException(status_code=404, detail=f"グループID {group_id} に対応するデータが存在しません。")
        
        db_vectors = []
        metadata_map = {}
        
        for row in db_data_raw:
            db_id = row['vector_id']
            db_vector = row['vector_data']
            db_metadata = row['text_data']
            try:
                # vector_data がリスト形式で取得されることを前提
                if isinstance(db_vector, str):
                    numeric_vector = json.loads(db_vector)
                elif isinstance(db_vector, list):
                    numeric_vector = db_vector
                else:
                    numeric_vector = list(db_vector)  # 他の形式の場合は適宜変換
                db_vectors.append((db_id, numeric_vector))
                metadata_map[db_id] = db_metadata
            except json.JSONDecodeError:
                logger.error(f"ベクトルデータのパースに失敗しました: ID={db_id}")
                continue  # パースに失敗したデータはスキップ
        
        data_list = await process_upload_files(files)
        
        if not data_list:
            logger.warning("アップロードされたファイルがありません。")
            raise HTTPException(status_code=400, detail="アップロードされたファイルがありません")
        
        results = []
        for query_doc in data_list:
            similarity_scores = calculate_similarity(query_doc, db_vectors)
            top_matches = sorted(similarity_scores, key=lambda x: x[1], reverse=True)[:3]
            result = {
                "query": query_doc,
                "top_matches": [
                    {
                        "similarity": score[1],
                        "metadata": metadata_map.get(score[0], {})
                    }
                    for score in top_matches
                ]
            }
            results.append(result)
        
        end = time.perf_counter()
        logger.info(f"処理時間: {end - start:.2f} 秒")
        
        return JSONResponse(
            content=results,
            headers={
                "Content-Disposition": "attachment; filename=search_results.json"
            }
        )
    
    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise he
    except Exception as error:
        logger.exception(f"サーチ処理中に予期しないエラーが発生しました: {error}")
        raise HTTPException(status_code=500, detail="サーチに失敗しました")
    finally:
        conn.close()
