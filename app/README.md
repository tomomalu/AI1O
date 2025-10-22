# AI1O Agent Web App

Claude Codeエージェントを簡単に実行できるWebアプリケーションです。

## 機能

- ✅ エージェント選択（.claude/agents/から自動読み込み）
- ✅ ファイル・フォルダの選択とアップロード
- ✅ プロンプト入力
- ✅ 出力先指定
- ✅ リアルタイム実行状況表示
- ✅ 結果表示とファイル管理
- 🚧 Claude Code API連携（現在は模擬実装）

## セットアップ

### 1. 依存関係のインストール

```bash
cd app
pip install -r requirements.txt
```

### 2. アプリケーション起動

```bash
python app.py
```

### 3. ブラウザでアクセス

```
http://localhost:5000
```

## 使い方

### 基本フロー

1. **エージェント選択**: 利用したいエージェントを選択
2. **ファイル選択**: 
   - ファイルアップロード、または
   - フォルダパス指定
3. **プロンプト入力**: エージェントに実行してほしい内容を入力
4. **出力先指定**: 結果を保存するフォルダを指定
5. **実行**: 「実行開始」ボタンをクリック
6. **結果確認**: 右側のパネルで進捗と結果を確認

### 利用可能なエージェント

アプリは自動的に `.claude/agents/` フォルダからエージェント定義を読み込みます：

- `job-customer-success`
- `job-field-sales` 
- `task-product-feature-doc-creator`
- `task-ui-sketch-creator`
- `task-ui-wireframe-creator`

## ファイル構成

```
app/
├── app.py                 # メインアプリケーション
├── requirements.txt       # Python依存関係
├── README.md             # このファイル
├── templates/
│   └── index.html        # メインページ
├── static/
│   ├── css/
│   │   └── style.css     # スタイルシート
│   └── js/
│       └── app.js        # JavaScript
├── uploads/              # アップロードファイル保存
└── output/               # 実行結果保存
```

## API エンドポイント

- `GET /` - メインページ
- `GET /api/agents` - エージェント一覧取得
- `POST /api/upload` - ファイルアップロード
- `POST /api/execute` - エージェント実行
- `GET /api/status` - 実行状況取得
- `GET /api/reset` - タスクリセット

## 現在の制限事項

### 模擬実装の部分

現在は開発・テスト用の模擬実装となっており、以下の機能は実際のClaude Code APIとは連携していません：

1. **エージェント実行**: サンプル結果を生成
2. **ファイル処理**: 実際の分析は行わず
3. **出力生成**: 固定のサンプルファイルを生成

### 本格実装への道筋

本格的なClaude Code API連携を実装するには、以下が必要です：

1. **Claude Code API の研究**
   - API仕様の調査
   - 認証方法の確認
   - レート制限の理解

2. **セキュリティ対応**
   - ファイルアップロードの安全性
   - API キーの管理
   - ユーザー認証（必要に応じて）

3. **エラーハンドリング**
   - API エラーの適切な処理
   - ファイルサイズ制限
   - タイムアウト処理

## 開発・カスタマイズ

### 新しいエージェントの追加

1. `.claude/agents/` に新しい `.md` ファイルを追加
2. アプリを再起動（自動検出）

### UIのカスタマイズ

- `static/css/style.css` でスタイル変更
- `templates/index.html` でレイアウト変更
- `static/js/app.js` で機能追加

### バックエンドの拡張

- `app.py` に新しいAPIエンドポイントを追加
- 実際のClaude Code API呼び出しロジックを実装

## トラブルシューティング

### アプリが起動しない

```bash
# Flaskのインストール確認
pip list | grep Flask

# ポートが使用中の場合
lsof -ti:5000 | xargs kill -9
```

### ファイルアップロードエラー

- アップロードフォルダの権限を確認
- ファイルサイズ制限の確認（デフォルト16MB）

### エージェントが表示されない

- `.claude/agents/` フォルダの存在確認
- エージェントファイルのフォーマット確認

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。