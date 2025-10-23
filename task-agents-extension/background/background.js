// Task Agents Chrome Extension - Background Script

chrome.runtime.onInstalled.addListener(() => {
    console.log('Task Agents Extension installed');
    
    // 右クリックメニューを作成
    chrome.contextMenus.create({
        id: 'taskAgents',
        title: 'Task Agentsで処理',
        contexts: ['page', 'selection', 'link']
    });
});

// 右クリックメニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'taskAgents') {
        // ポップアップを開く（拡張機能アイコンクリックと同じ効果）
        chrome.action.openPopup();
    }
});

// 拡張機能アイコンがクリックされた時の処理
chrome.action.onClicked.addListener((tab) => {
    // manifest.jsonでdefault_popupが設定されているため、
    // この処理は通常実行されない
    console.log('Extension icon clicked');
});

// メッセージ処理（将来の機能拡張用）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    switch (request.action) {
        case 'saveCommand':
            // コマンド履歴を保存
            saveCommandHistory(request.data);
            sendResponse({success: true});
            break;
        
        case 'getCommandHistory':
            // コマンド履歴を取得
            getCommandHistory().then(history => {
                sendResponse({success: true, data: history});
            });
            return true; // 非同期レスポンス
        
        default:
            sendResponse({success: false, error: 'Unknown action'});
    }
});

// コマンド履歴を保存
async function saveCommandHistory(commandData) {
    try {
        const result = await chrome.storage.local.get(['commandHistory']);
        const history = result.commandHistory || [];
        
        // 新しいコマンドを追加
        history.unshift({
            ...commandData,
            timestamp: Date.now(),
            id: generateId()
        });
        
        // 最大50件まで保持
        if (history.length > 50) {
            history.splice(50);
        }
        
        await chrome.storage.local.set({commandHistory: history});
        console.log('Command history saved');
    } catch (error) {
        console.error('Failed to save command history:', error);
    }
}

// コマンド履歴を取得
async function getCommandHistory() {
    try {
        const result = await chrome.storage.local.get(['commandHistory']);
        return result.commandHistory || [];
    } catch (error) {
        console.error('Failed to get command history:', error);
        return [];
    }
}

// ユニークIDを生成
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 設定の保存/読み込み
async function saveSetting(key, value) {
    try {
        await chrome.storage.local.set({[key]: value});
    } catch (error) {
        console.error('Failed to save setting:', error);
    }
}

async function getSetting(key, defaultValue = null) {
    try {
        const result = await chrome.storage.local.get([key]);
        return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
        console.error('Failed to get setting:', error);
        return defaultValue;
    }
}