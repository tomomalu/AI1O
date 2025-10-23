# AIエラー解決機能 - UI要素構成

## 概要
ASCIIワイヤーフレームからExcalidraw JSON形式に変換したUIレイアウトの詳細説明

## レイアウト構成

### 1. ヘッダー部分
- **main-container**: 全体のメインコンテナ (800x600)
- **header-bg**: ヘッダー背景 (グレー #f5f5f5)
- **header-title**: "ロボオペレータ - エラー監視" タイトル

### 2. ナビゲーション
- **nav-bg**: ナビゲーション背景 (#e8e8e8)
- **nav-home**, **nav-robots**, **nav-errors**, **nav-settings**: 各ナビゲーションボタン

### 3. 統計カードエリア
#### 左側: エラー状況カード
- **error-stats-card**: エラー統計カード背景
- **error-stats-title**: "📊 本日のエラー状況" タイトル
- **error-stats-count**, **error-stats-resolved**, **error-stats-pending**: 各統計項目
- **error-stats-rate**: 解決率表示

#### 右側: ロボット状況カード
- **robot-status-card**: ロボット状況カード背景
- **robot-status-title**: "🤖 実行中のロボット" タイトル
- **robot-status-active**, **robot-status-stopped**, **robot-status-error**: 各状況項目
- **robot-status-detail-btn**: "詳細を見る" ボタン

### 4. リアルタイムエラー検知パネル
- **realtime-error-panel**: 赤系背景のエラー検知パネル (#fff5f5)
- **realtime-error-title**: "🚨 リアルタイムエラー検知" タイトル
- **realtime-error-warning**: エラー警告メッセージ
- **realtime-error-time**: 発生時刻表示
- **ai-analysis-text**: AI分析進行中メッセージ
- **progress-bar**, **progress-fill**: プログレスバー (60%完了)
- **ai-result-text**: "💡 分析完了！解決方法が見つかりました"
- **detail-check-btn**, **later-check-btn**: 詳細確認・後で確認ボタン

### 5. エラー一覧パネル
- **error-list-panel**: エラー一覧パネル背景 (#fafafa)
- **error-list-title**: "📋 最近のエラー一覧" タイトル
- **error-list-date**: "📅 2025/10/23" 日付表示
- **error-item-1**, **error-item-2**, **error-item-3**: 各エラーアイテム
- **more-btn**, **csv-export-btn**: "もっと見る"・"CSV出力" ボタン

## 色彩設計
- **メイン背景**: #ffffff (白)
- **ヘッダー**: #f5f5f5 (薄いグレー)
- **ナビゲーション**: #e8e8e8 (グレー)
- **カード背景**: #f9f9f9 (オフホワイト)
- **エラー警告**: #fff5f5 (薄い赤)
- **アクセント**: #0066cc (青)、#ff0000 (赤)

## 使用方法
1. Excalidrawを開く
2. "Load Scene" → "Paste JSON" を選択
3. ui-sketch.json の内容をペースト
4. レイアウトが読み込まれて編集可能になります

## 注意事項
- 位置・サイズは概算値で設定されています
- Excalidrawで実際のレイアウトに合わせて調整してください
- 全ての日本語テキストは正常に表示されます
- ボタンや入力要素は矩形+テキストで表現されています