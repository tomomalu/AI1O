# フォルダ名変更ガイド

## 📁 フォルダ名を自由に変更する方法

### 1. 環境変数で設定

```bash
# agentsフォルダ名を変更
export AGENTS_FOLDER="../my-agents"

# appフォルダ名を変更  
export APP_FOLDER_NAME="web-app"

# アプリ起動
python3 app.py
```

### 2. 設定ファイルで変更

`app/config.py` の `DEFAULT_CONFIG` を編集：

```python
DEFAULT_CONFIG = {
    'APP_FOLDER_NAME': 'my-web-app',      # appフォルダ名
    'AGENTS_FOLDER': '../my-agents',      # agentsフォルダパス
    'UPLOAD_FOLDER': 'uploads',
    'OUTPUT_FOLDER': 'results',           # 出力フォルダ名
    # ...
}
```

### 3. 実際のフォルダ名変更例

#### 現在の構成
```
ai-agents/
├── app/           ← このフォルダ名を変更したい
└── agents/        ← このフォルダ名を変更したい
```

#### 変更後の構成例
```
ai-agents/
├── web-interface/     ← 新しいフォルダ名
└── claude-agents/     ← 新しいフォルダ名
```

#### 設定変更
```bash
# 環境変数設定
export APP_FOLDER_NAME="web-interface"
export AGENTS_FOLDER="../claude-agents"

# または config.py で設定
```

## 🎯 変更可能な項目

| 項目 | デフォルト | 説明 |
|------|------------|------|
| `APP_FOLDER_NAME` | `app` | Webアプリのフォルダ名 |
| `AGENTS_FOLDER` | `../agents` | エージェント定義フォルダのパス |
| `UPLOAD_FOLDER` | `uploads` | アップロードファイル保存先 |
| `OUTPUT_FOLDER` | `output` | 実行結果保存先 |
| `HOST` | `127.0.0.1` | サーバーホスト |
| `PORT` | `5001` | サーバーポート |

## 🚀 実行例

```bash
# ポートを変更して起動
export PORT=8080
python3 app.py

# すべて環境変数で設定
export APP_FOLDER_NAME="my-app"
export AGENTS_FOLDER="../../agents"
export PORT=3000
export OUTPUT_FOLDER="generated"
python3 app.py
```

## ⚠️ 注意点

1. **相対パス**: `AGENTS_FOLDER` はappフォルダからの相対パス
2. **フォルダ作成**: 存在しないフォルダは自動作成される
3. **設定確認**: 起動時にログで設定内容が表示される

これで自由にフォルダ名を変更できます！