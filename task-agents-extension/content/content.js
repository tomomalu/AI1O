// Task Agents Chrome Extension - Content Script

// コンテンツスクリプトの初期化
console.log('Task Agents content script loaded');

// 将来の機能拡張用：ページ内での特別な処理
// 例：特定のファイルリンクを検出して右クリックメニューを強化など

// メッセージリスナー（バックグラウンドスクリプトからの通信用）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    switch (request.action) {
        case 'getPageInfo':
            // ページ情報を取得
            const pageInfo = {
                title: document.title,
                url: window.location.href,
                selection: window.getSelection().toString()
            };
            sendResponse({success: true, data: pageInfo});
            break;
        
        case 'findFileLinks':
            // ページ内のファイルリンクを検索
            const fileLinks = findFileLinksOnPage();
            sendResponse({success: true, data: fileLinks});
            break;
        
        default:
            sendResponse({success: false, error: 'Unknown action'});
    }
});

// ページ内のファイルリンクを検索
function findFileLinksOnPage() {
    const fileExtensions = ['.md', '.txt', '.json', '.csv', '.pdf', '.docx'];
    const links = [];
    
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        const hasFileExtension = fileExtensions.some(ext => 
            href.toLowerCase().includes(ext)
        );
        
        if (hasFileExtension) {
            links.push({
                url: href,
                text: link.textContent.trim(),
                element: link
            });
        }
    });
    
    return links;
}

// 右クリック時の追加処理（将来的な機能）
document.addEventListener('contextmenu', (event) => {
    // 将来：右クリックされた要素に応じて追加メニューを表示
    // 例：ファイルリンクを右クリックした場合の特別処理
});

// ファイルドロップの検出（将来的な機能）
document.addEventListener('dragover', (event) => {
    // 将来：ページにファイルがドロップされた時の処理
});

document.addEventListener('drop', (event) => {
    // 将来：ドロップされたファイルをTask Agentsに送信
});