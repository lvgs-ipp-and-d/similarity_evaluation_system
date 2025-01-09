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
