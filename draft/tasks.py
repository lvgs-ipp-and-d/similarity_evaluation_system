from celery.utils.log import get_task_logger
from datasketch import MinHash, MinHashLSH
from draft import tokenize_combined_data
from celery_app import app
import psycopg2
import json

logger = get_task_logger(__name__)

# データベース接続を作成する関数
def get_db_connection():
    return psycopg2.connect(
        host="db",
        port="5432",
        dbname="postgres_vector_db",
        user="user",
        password="password"
    )
    
# カスタム例外を定義
class ProcessingException(Exception):
    pass

@app.task(bind=True)
def process_group_task(self, data_list, group_name, division_name, file_info_list):
    try:
        # MinHashLSHの初期化
        num_perm = 128
        minhashes = []
        lsh = MinHashLSH(threshold=0.6, num_perm=num_perm)
        logger.info("MinHashLSHオブジェクトを初期化しました。")

        # MinHash作成とLSH登録
        for i, doc in enumerate(data_list):
            logger.info(f"ファイル {doc['file_name']} のMinHashを作成中...")
            m = MinHash(num_perm=num_perm)
            tokens = tokenize_combined_data(doc["file_data"])
            for token in tokens:
                m.update(token.encode("utf-8"))
            minhashes.append(m)
            lsh.insert(f"doc_{i}", m)
            logger.info(f"ファイル {doc['file_name']} のMinHashをLSHに登録しました。")

        # LSHによるグルーピング
        visited = set()
        groups = []
        for i, m in enumerate(minhashes):
            if i not in visited:
                similar_docs = lsh.query(m)
                ids = {int(doc_id.split("_")[1]) for doc_id in similar_docs}
                groups.append(ids)
                visited.update(ids)
                logger.info(f"グループ {len(groups)} にデータID {ids} を追加しました。")

        # グルーピング結果の整形
        grouped_results = [
            {"Group": idx, "Texts": [data_list[doc_id]["file_data"] for doc_id in group]} 
            for idx, group in enumerate(groups, start=1)
        ]
        logger.info("グルーピング結果を整形しました。")

        # データベース操作
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # グループ情報を挿入し、自動生成された group_id を取得
                cur.execute(
                    """
                    INSERT INTO groups (division_name, group_name, grouped_data)
                    VALUES (%s, %s, %s)
                    RETURNING group_id, created_at;
                    """,
                    (division_name, group_name, json.dumps(grouped_results, ensure_ascii=False))
                )
                group_id, created_at = cur.fetchone()  # 自動生成された group_id を取得
                logger.info(f"新しいグループが作成されました。group_id: {group_id}")

                # ファイル情報の挿入
                for doc in data_list:
                    cur.execute(
                        """
                        INSERT INTO upload_files (group_id, file_name, file_size)
                        VALUES (%s, %s, %s)
                        """,
                        (group_id, doc["file_name"], doc.get("file_size", 0))
                    )

                # ベクトルデータとテキストデータの挿入
                for i, doc in enumerate(data_list):
                    logger.info(f"データID {i} を挿入中...")
                    vec = [float(v) for v in minhashes[i].hashvalues]
                    cur.execute(
                        "INSERT INTO elements_vectors (group_id, vector_data) VALUES (%s, %s) RETURNING vector_id;",
                        (group_id, vec)
                    )
                    vector_id = cur.fetchone()[0]
                    cur.execute(
                        "INSERT INTO elements_texts (vector_id, text_data, group_id) VALUES (%s, %s, %s);",
                        (vector_id, json.dumps(doc, ensure_ascii=False), group_id)
                    )

                conn.commit()
                logger.info("データベース操作が完了しました。")

        # 結果をJSONファイルに保存
        output_file = "./test-data/grouping_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(grouped_results, f, indent=4, ensure_ascii=False)
        logger.info("結果をJSONファイルに保存しました。")

        logger.info("グルーピング処理が正常に完了しました。")
        return {
            "group_id": group_id, 
            "group_name": group_name,
            "created_at": created_at,
            "file_info": file_info_list,
        }

    except Exception as e:
        logger.error(f"エラーが発生しました: {str(e)}")
        self.update_state(state="FAILURE", meta={"exc": str(e)})
        raise
