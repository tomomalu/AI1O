// Task Agents - エージェントテンプレート定義

const AGENT_TEMPLATES = {
    'task-product-feature-doc-creator': {
        name: 'task-product-feature-doc-creator',
        displayName: 'プロダクト機能ドキュメント作成',
        description: '製品機能の企画書・仕様書を作成します',
        template: `【機能名】機能の企画書を作成してください。

機能の概要：
- 

開発期間：ヶ月
プロジェクト体制：

参考資料：
- `
    },
    
    'task-ui-sketch-creator': {
        name: 'task-ui-sketch-creator',
        displayName: 'UIスケッチ作成',
        description: 'ユーザーインターフェースのスケッチを作成します',
        template: `「【機能名】」機能のUIスケッチを作成してください。

主要画面：
- 
- 
- 

ターゲットユーザー：
要件：
- `
    },
    
    'task-ui-wireframe-creator': {
        name: 'task-ui-wireframe-creator',
        displayName: 'UIワイヤーフレーム作成',
        description: 'ユーザーインターフェースのワイヤーフレームを作成します',
        template: `「【機能名】」機能のワイヤーフレームを作成してください。

画面仕様：
- 
- 

機能要件：
- 
- 

デザイン要件：
- `
    },
    
    'ui-sketch-creator': {
        name: 'ui-sketch-creator',
        displayName: 'UIスケッチ作成（フォルダ版）',
        description: 'フォルダ構成のUIスケッチエージェントを使用します',
        template: `「【機能名】」機能のUIスケッチを作成してください。

主要画面：
- 
- 
- 

ターゲットユーザー：
要件：
- `
    },
    
    'job-customer-success': {
        name: 'job-customer-success',
        displayName: 'カスタマーサクセス業務',
        description: '顧客成功支援業務をサポートします',
        template: `カスタマーサクセス業務について以下の内容でサポートしてください：

課題・目標：


顧客情報：
- 

実施項目：
- `
    },
    
    'job-field-sales': {
        name: 'job-field-sales',
        displayName: 'フィールドセールス業務',
        description: '営業活動業務をサポートします',
        template: `フィールドセールス業務について以下の内容でサポートしてください：

営業目標：


ターゲット顧客：
- 

アプローチ方法：
- `
    },
    
    'ui-sketch-json-creator': {
        name: 'ui-sketch-json-creator',
        displayName: 'ASCII→JSON変換',
        description: 'ASCIIワイヤーフレームをJSONに変換します',
        template: `ASCIIワイヤーフレームをJSONに変換してください。

既存のASCIIファイル：

対象機能：
変換要件：
- `
    }
};

// エージェント一覧を取得
function getAvailableAgents() {
    return Object.values(AGENT_TEMPLATES);
}

// 特定のエージェントテンプレートを取得
function getAgentTemplate(agentName) {
    return AGENT_TEMPLATES[agentName];
}

// エージェント名の一覧を取得
function getAgentNames() {
    return Object.keys(AGENT_TEMPLATES);
}

// グローバルに公開（拡張機能で使用）
if (typeof window !== 'undefined') {
    window.AGENT_TEMPLATES = AGENT_TEMPLATES;
    window.getAvailableAgents = getAvailableAgents;
    window.getAgentTemplate = getAgentTemplate;
    window.getAgentNames = getAgentNames;
}