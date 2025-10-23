// Task Agents Chrome Extension - Background Script with Native Messaging

console.log('Task Agents Extension installed');
console.log('Extension ID:', chrome.runtime.id);

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

// Native Messaging - Chrome拡張 → Node.jsスクリプト通信
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Background received message:', msg);
    
    if (msg.action === "getFilePathFromNative") {
        try {
            console.log("Attempting to connect to native host...");
            const port = chrome.runtime.connectNative("com.taskagents.pathhost");
            console.log("Port created:", port);
            
            const message = { 
                action: 'getFilePath',
                filename: msg.filename,
                searchPaths: msg.searchPaths || [
                    '/Users/tomomalu/Desktop',
                    '/Users/tomomalu/Downloads',
                    '/Users/tomomalu/Documents',
                    '/Volumes/SSD-PROJECT/AI1O/task-agents/output',
                    '/Volumes/SSD-PROJECT/AI1O/project'
                ]
            };
            console.log("Sending message to native host:", message);
            port.postMessage(message);
            
            port.onMessage.addListener(response => {
                console.log("Nativeからの応答:", response);
                sendResponse(response);
            });
            
            port.onDisconnect.addListener(() => {
                console.log("Native接続終了");
                if (chrome.runtime.lastError) {
                    console.error("Native messaging error:", chrome.runtime.lastError);
                    sendResponse({ 
                        success: false, 
                        error: chrome.runtime.lastError.message 
                    });
                }
            });
            
            return true; // async応答
        } catch (error) {
            console.error("Native messaging failed:", error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    // 既存のメッセージ処理
    switch (msg.action) {
        case 'saveCommand':
            // コマンド履歴を保存
            saveCommandHistory(msg.data);
            sendResponse({success: true});
            break;
        
        case 'getCommandHistory':
            // コマンド履歴を取得
            getCommandHistory().then(history => {
                sendResponse({success: true, data: history});
            });
            return true; // 非同期レスポンス
        
        default:
            if (msg.action !== "getFilePathFromNative") {
                sendResponse({success: false, error: 'Unknown action'});
            }
    }
});

// 既存の関数（コマンド履歴保存など）
async function saveCommandHistory(commandData) {
    try {
        const result = await chrome.storage.local.get(['commandHistory']);
        const history = result.commandHistory || [];
        
        history.unshift({
            ...commandData,
            timestamp: Date.now(),
            id: generateId()
        });
        
        if (history.length > 50) {
            history.splice(50);
        }
        
        await chrome.storage.local.set({commandHistory: history});
        console.log('Command history saved');
    } catch (error) {
        console.error('Failed to save command history:', error);
    }
}

async function getCommandHistory() {
    try {
        const result = await chrome.storage.local.get(['commandHistory']);
        return result.commandHistory || [];
    } catch (error) {
        console.error('Failed to get command history:', error);
        return [];
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}