### ファイル構成

```
project/
├── app/
│ ├── **init**.py
│ ├── controllers/ # プレゼンテーション層: リクエストを処理
│ │ ├── **init**.py
│ │ └── user_controller.py
│ ├── services/ # アプリケーション層: ビジネスロジックを実装
│ │ ├── **init**.py
│ │ └── user_service.py
│ ├── repositories/ # Prisma を利用したデータアクセス層
│ │ ├── **init**.py
│ │ └── user_repository.py
│ ├── models/ # ドメイン層: Prisma の型定義
│ │ ├── **init**.py
│ │ └── prisma_client.py # Prisma クライアント設定
│ ├── utils/ # ユーティリティ層: 共通処理
│ │ ├── **init**.py
│ │ └── logger.py
│ └── config.py # アプリケーション設定
├── prisma/ # Prisma のスキーマ
│ ├── schema.prisma # Prisma のスキーマ定義
│ ├── migrations/ # Prisma のマイグレーションファイル
├── tests/ # テストコード
│ ├── **init**.py
│ └── test_user.py
├── requirements.txt # 依存関係リスト
├── run.py # アプリケーションのエントリーポイント
└── README.md # ドキュメント
```
