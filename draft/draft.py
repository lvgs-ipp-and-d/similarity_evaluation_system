# ライブラリのインポート
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datasketch import MinHash, MinHashLSH
from contextlib import asynccontextmanager
from google.auth.transport import requests
from psycopg2.extras import RealDictCursor
from google.oauth2 import id_token
from pydantic import BaseModel
from typing import List
import psycopg2
import logging
import json
import asyncpg
import time

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
    logger.info(f"トークン化結果: {tokens}")
    return tokens

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

        # 2. テーブル作成（Vector）
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS Vectors (
                vector_id SERIAL PRIMARY KEY,
                vector_data vector
            );
            """
        )

        # 3. テーブル作成（Metadata）
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS Sources (
                source_id SERIAL PRIMARY KEY,
                vector_id INTEGER REFERENCES Vectors(vector_id) ON DELETE CASCADE,
                source_data JSONB
            );
            """
        )

        # 4. テーブル作成（Groups）
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS Groups (
                group_id SERIAL PRIMARY KEY,
                division_name VARCHAR(255),
                group_name VARCHAR(255),
                group_data JSONB
            );
            """
        )

        # 5. テーブル作成（files）
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS Files (
                file_id SERIAL PRIMARY KEY,
                group_id INT NOT NULL REFERENCES Groups(group_id) ON DELETE CASCADE,
                file_name VARCHAR(255),
                file_data JSONB
            )
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

"""
ログイン処理
"""
# ログイン用エンドポイント（Google OAuth）
CLIENT_ID = "878970328790-042rmsh815pl6lo078jokinatuqsliuc.apps.googleusercontent.com"

@app.post("/auth/google")
async def google_auth(token: Token):
    try:
        # Googleトークンの検証
        id_info = id_token.verify_oauth2_token(
            token.token, 
            requests.Request(), 
            CLIENT_ID, 
            clock_skew_in_seconds=5
        )
        
        # 必要なユーザー情報を取得
        email = id_info["email"]
        if not email.endswith("@leverages.jp"):
            # 許可されていないドメインの場合はエラーを返す
            print(f"許可されていないメールアドレス: {email}")
            raise HTTPException(status_code=403, detail="許可されていないメールアドレスです")
        
        # 必要なユーザー情報を取得
        user_info = {
            "user_id": id_info["sub"],
            "email": id_info["email"],
            "name": id_info["name"],
            "picture": id_info["picture"]
        }
        
        return {"message": "Google認証成功", "user_info": user_info}
    except ValueError as error:
        print(f"ValueError: {error}")
        raise HTTPException(status_code=401, detail="無効なトークン")
    
"""
ログアウト処理
"""
# ログアウト用エンドポイント
@app.post("/auth/logout")
async def logout(response: Response):
    try:
        # セッションやトークンを無効化する処理
        response.delete_cookie("session_token")
        return {"message": "ログアウトしました"}
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(status_code=500, detail="ログアウト処理に失敗しました")

"""
グループ化処理
"""
# 新規グループ登録用エンドポイント（POST: /group）
@app.post("/group")
async def create_group(
    request: GroupCreateRequest,
    conn = Depends(get_db)
    ):
    
    # データベース接続
    cur = conn.cursor()
    
    try:
        # データベースにグループを登録
        cur.execute(
            "INSERT INTO Groups (division_name, group_name) VALUES (%s, %s) RETURNING group_id;",
            (request.division_name, request.group_name,)
        )
        group_id = cur.fetchone()[0] # 登録したグループIDを取得
        print("正常にグループを登録しました")
        conn.commit()
        # group_id, griup_name, division_nameを返す
        return {"group_id": group_id, "group_name": request.group_name, "division_name": request.division_name}
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(status_code=500, detail="グループの登録に失敗しました")
    finally:
        cur.close()

# 既存グループ取得用エンドポイント（GET: /group）
@app.get("/groups")
async def get_groups(
    division_name: str,
    conn = Depends(get_db)
):
    cur = conn.cursor()
    try:
        print(f"グループリスト取得リクエスト: division_name={division_name}")
        cur.execute(
            "SELECT group_id, group_name, division_name FROM Groups WHERE division_name = %s ORDER BY group_id ASC;",
            (division_name,)
        )
        results = cur.fetchall()
        print(f"取得結果: {results}")

        # 結果が空の場合も空のリストを返す
        group_list = [{"id": result[0], "name": result[1]} for result in results]
        return {"groups": group_list}
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(status_code=500, detail="グループの取得中にエラーが発生しました")
    finally:
        cur.close()

# 特定グループ取得用エンドポイント（GET: /group/{group_id}）
@app.get("/group/{group_id}")
async def get_group(
    group_id: int,
    division_name: str,
    conn = Depends(get_db)
):
    cur = conn.cursor()
    try:
        print(f"グループ取得リクエスト: group_id={group_id}, division_name={division_name}")

        # グループと関連ファイルを取得
        cur.execute(
            """
            SELECT 
                g.group_id AS group_id,
                g.group_name AS group_name,
                g.division_name AS division_name,
                COALESCE(f.file_id, 0) AS file_id,
                COALESCE(f.file_name, '未設定') AS file_name
            FROM Groups g
            LEFT JOIN Files f ON g.group_id = f.group_id
            WHERE g.division_name = %s AND g.group_id = %s
            ORDER BY g.group_id ASC;
            """,
            (division_name, group_id)
        )
        results = cur.fetchall()
        print(f"取得結果: {results}")

        if not results:
            raise HTTPException(
                status_code=404,
                detail="指定されたグループが見つかりません"
            )

        # クエリ結果を基に group_dict を作成
        group_dict = {
            "id": results[0][0],
            "name": results[0][1],
            "division_name": results[0][2],
            "files": [
                {
                    "file_id": result[3],
                    "file_name": result[4],
                }
                for result in results if result[3]  # ファイルが存在する場合のみ
            ],
        }

        return {"group": group_dict}
    except Exception as error:
        print(f"Error: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"グループの取得中にエラーが発生しました: {str(error)}"
        )
    finally:
        cur.close()


# 既存グループを削除するエンドポイント（DELETE: /group）
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
            "SELECT group_id FROM Groups WHERE group_id = %s",
            (group_id,)
        )
        group_exists = cur.fetchone()
        print(f"クエリ結果: {group_exists}")

        if not group_exists:
            raise HTTPException(status_code=404, detail="削除対象のグループが見つかりません")
        
        # Filesテーブルから該当グループのファイルを削除
        cur.execute(
            "DELETE FROM Files WHERE group_id = %s",
            (group_id,)
        )

        # Groupsテーブルから該当グループを削除
        cur.execute(
            "DELETE FROM Groups WHERE group_id = %s",
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


# グルーピング処理用エンドポイント（POST: /group/process）
@app.post("/group/process")
async def process_group(
    files: List[UploadFile] = File(...),
    group_id: int = Form(...), 
    group_name: str = Form(...),
    division_name: str = Form(...),
    conn = Depends(get_db)
    ):
    
    # 処理時間の計測
    start = time.time()
    
    # データベース接続
    cur = conn.cursor()
    
    try:
        logger.info("グルーピング処理を開始します。")
        
        data_list = []  # すべてのアップロードファイルのデータを格納するリスト

        for file in files:
            logger.info(f"ファイル {file.filename} の処理を開始します。")
            if file.content_type not in ["application/json", "application/octet-stream"]:
                logger.warning(f"ファイル形式が正しくありません: {file.content_type}")
                raise HTTPException(status_code=400, detail=f"ファイル形式が正しくありません: {file.content_type}")
            
            try:
                content = await file.read()  # ファイルの読み込み
                json_data = json.loads(content)  # JSONデータの読み込み

                # JSONデータがリスト形式であるかを確認
                if isinstance(json_data, list):
                    for item in json_data:
                        data_list.append({"filename": file.filename, "file_data": item})
                elif isinstance(json_data, dict):
                    data_list.append({"filename": file.filename, "file_data": json_data})
                else:
                    logger.error("JSONデータがリスト形式でも辞書形式でもありません。")
                    raise HTTPException(status_code=400, detail="JSONデータが不正です。")

                logger.info(f"ファイル {file.filename} の読み込みに成功しました。")
            except json.JSONDecodeError:
                logger.error(f"ファイルの読み込みに失敗しました: {file.filename}")
                raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {file.filename}")

        if not data_list:
            logger.warning("アップロードされたファイルがありません。")
            raise HTTPException(status_code=400, detail="アップロードされたファイルがありません")

        # グルーピング処理の実行
        num_perm = 128  # MinHashLSHのハッシュ数
        minhashes = []  # MinHashオブジェクトを格納するリスト
        # MinHashLSHオブジェクト
        lsh = MinHashLSH(threshold=0.6, num_perm=num_perm)
        logger.info("MinHashLSHオブジェクトを初期化しました。")

        # MinHashシグネチャ作成とLSH登録
        for i, doc in enumerate(data_list):
            logger.info(f"ファイル {doc['filename']} のMinHashを作成中...")
            m = MinHash(num_perm=num_perm)
            tokens = tokenize_combined_data(doc["file_data"])
            for token in tokens:
                m.update(token.encode("utf-8"))
            minhashes.append(m)
            lsh.insert(f"doc_{i}", m)
            logger.info(f"ファイル {doc['filename']} のMinHashをLSHに登録しました。")

        # LSHで類似データをグルーピング化
        visited = set()
        groups = []

        # 未訪問のMinHashを取得し、類似ドキュメントをグルーピング
        for i, m in enumerate(minhashes):
            if i not in visited:
                similar_docs = lsh.query(m)
                ids = {int(doc_id.split("_")[1]) for doc_id in similar_docs}
                groups.append(ids)
                visited.update(ids)
                logger.info(f"グループ {len(groups)} にデータID {ids} を追加しました。")

        # グルーピング結果をJSON形式に整形
        grouped_results = []
        for idx, group in enumerate(groups, start=1):
            grouped_documents = []
            for doc_id in group:
                doc = data_list[doc_id]["file_data"]
                
                # doc が辞書の場合
                if isinstance(doc, dict):
                    grouped_documents.append({key: value for key, value in doc.items() if not isinstance(value, (dict, list))})
                # doc がリストの場合
                elif isinstance(doc, list):
                    for sub_doc in doc:
                        if isinstance(sub_doc, dict):
                            grouped_documents.append({key: value for key, value in sub_doc.items() if not isinstance(value, (dict, list))})
                        else:
                            logger.warning(f"リスト内の要素が辞書ではありません: {sub_doc}")
                else:
                    logger.warning(f"想定外のデータ形式: {doc}")
                
            # グループ全体のデータを収集後に追加
            grouped_results.append({
                "Group": idx,
                "Documents": grouped_documents
            })

        logger.info("グルーピング結果を整形しました。")

        # グルーピング結果をGroupsテーブルに挿入または更新
        logger.info(f"Groupsテーブルを更新します。group_id: {group_id}, group_name: {group_name}")
        cur.execute(
            """
            SELECT group_id FROM Groups WHERE group_id = %s AND group_name = %s
            """,
            (group_id, group_name)
        )
        result = cur.fetchone()
        if result:
            logger.info(f"既存のグループを更新します。group_id: {group_id}")
            cur.execute(
                """
                UPDATE Groups 
                SET group_data = %s 
                WHERE group_id = %s AND group_name = %s
                """,
                (json.dumps(grouped_results, ensure_ascii=False), group_id, group_name)
            )
            logger.info("Groupsテーブルの更新に成功しました。")
        else:
            logger.info(f"Groupsテーブルに新規グループを挿入します。group_id: {group_id}, group_name: {group_name}")
            cur.execute(
                """
                INSERT INTO Groups (group_id, division_name, group_name, group_data)
                VALUES (%s, %s, %s, %s)
                """,
                (group_id, division_name, group_name, json.dumps(grouped_results, ensure_ascii=False))
            )
            logger.info("Groupsテーブルに新規グループを挿入しました。")

        # ファイル情報をFilesテーブルに挿入
        logger.info(f"Filesテーブルにファイル {file.filename} を挿入します。")
        cur.execute(
            """
            INSERT INTO Files (group_id, file_name, file_data)
            VALUES (%s, %s, %s)
            """,
            (group_id, file.filename, json.dumps(data_list[0]["file_data"], ensure_ascii=False))
        )
        logger.info(f"ファイル {file.filename} をFilesテーブルに挿入しました。")
    
        # 結果をJSONファイルに保存
        output_file = "./test-data/grouping_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(grouped_results, f, indent=4, ensure_ascii=False)

        # データ挿入
        for i, doc in enumerate(data_list):
            logger.info(f"Vectorsテーブルにデータを挿入します。データID: {i}")
            # ベクトルデータをリストに変換（floatに変換）
            vec = [float(v) for v in minhashes[i].hashvalues]

            # ベクトルデータをVectorテーブルに挿入
            cur.execute(
                "INSERT INTO Vectors (vector_data) VALUES (%s) RETURNING vector_id;",
                (vec,)
            )
            vector_id = cur.fetchone()[0]
            logger.info(f"Vector ID {vector_id} を取得しました。")

            # メタデータをMetadataテーブルに挿入
            cur.execute(
                "INSERT INTO Sources (vector_id, source_data) VALUES (%s, %s);",
                (vector_id, json.dumps(doc, ensure_ascii=False))
            )
            logger.info(f"Metadataテーブルにvector_id {vector_id} のデータを挿入しました。")

        # トランザクションをコミット
        conn.commit()
        logger.info("グルーピング処理が正常に完了しました。")
        end_time = time.time()
        elapsed_time = end_time - start
        logger.info(f"処理時間: {elapsed_time} 秒")
        return {"message": "正常にグルーピング処理が完了しました"}

    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise he
    except Exception as error:
        logger.exception(f"グルーピング処理中に予期しないエラーが発生しました: {error}")
        raise HTTPException(status_code=500, detail="グルーピング処理に失敗しました")
    finally:
        cur.close()

# グルーピング結果ダウンロード用エンドポイント（GET: /group/download）
@app.get("/group/{group_id}/download", response_class=JSONResponse)
def download_group(group_id: int, conn=Depends(get_db)):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # `group_id` に一致するデータを取得
        cur.execute(
            "SELECT group_data FROM Groups WHERE group_id = %s",
            (group_id,)
        )
        result = cur.fetchone()

        # データが存在しない場合
        if not result or not result["group_data"]:
            raise HTTPException(status_code=404, detail="指定されたグループが見つかりません")

        # JSON形式でデータを返却
        return JSONResponse(
            content=result["group_data"],
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
# 新規グループ登録用エンドポイント（POST: /search）

# サーチ用エンドポイント

# データベース終了