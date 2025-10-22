// AI1O Agent Web App JavaScript

let statusCheckInterval = null;
let uploadedFiles = [];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI1O Agent Web App initialized');
    
    // ファイルアップロードのイベントリスナー
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // 初期状態をチェック
    checkStatus();
});

// ファイルアップロード処理
async function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) return;
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    try {
        showMessage('ファイルをアップロード中...', 'info');
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadedFiles = result.files;
            displayUploadedFiles();
            showMessage(`${result.files.length}個のファイルをアップロードしました`, 'success');
        } else {
            showMessage(`アップロードエラー: ${result.error}`, 'danger');
        }
    } catch (error) {
        showMessage(`アップロードエラー: ${error.message}`, 'danger');
    }
}

// アップロードされたファイルを表示
function displayUploadedFiles() {
    const uploadedFilesDiv = document.getElementById('uploadedFiles');
    const filesList = document.getElementById('filesList');
    
    if (uploadedFiles.length === 0) {
        uploadedFilesDiv.style.display = 'none';
        return;
    }
    
    uploadedFilesDiv.style.display = 'block';
    filesList.innerHTML = '';
    
    uploadedFiles.forEach(filename => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
            <span><i class="fas fa-file"></i> ${filename}</span>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFile('${filename}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        filesList.appendChild(listItem);
    });
}

// ファイルを削除
function removeFile(filename) {
    uploadedFiles = uploadedFiles.filter(f => f !== filename);
    displayUploadedFiles();
    showMessage(`${filename} を削除しました`, 'info');
}

// エージェント実行
async function executeAgent() {
    // 入力検証
    const selectedAgent = document.querySelector('input[name="agent"]:checked');
    if (!selectedAgent) {
        showMessage('エージェントを選択してください', 'warning');
        return;
    }
    
    const prompt = document.getElementById('promptInput').value.trim();
    if (!prompt) {
        showMessage('プロンプトを入力してください', 'warning');
        return;
    }
    
    const outputPath = document.getElementById('outputPath').value.trim() || 'output';
    const folderPath = document.getElementById('folderPath').value.trim();
    
    // 入力ファイル情報を集約
    let inputFiles = [...uploadedFiles];
    if (folderPath) {
        inputFiles.push(folderPath);
    }
    
    try {
        // 実行ボタンを無効化
        const executeBtn = document.getElementById('executeBtn');
        executeBtn.disabled = true;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 実行中...';
        
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent: selectedAgent.value,
                prompt: prompt,
                input_files: inputFiles,
                output_path: outputPath
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('エージェントの実行を開始しました', 'success');
            startStatusMonitoring();
        } else {
            showMessage(`実行エラー: ${result.error}`, 'danger');
            resetExecuteButton();
        }
    } catch (error) {
        showMessage(`実行エラー: ${error.message}`, 'danger');
        resetExecuteButton();
    }
}

// ステータス監視開始
function startStatusMonitoring() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    statusCheckInterval = setInterval(checkStatus, 1000);
}

// ステータス監視停止
function stopStatusMonitoring() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

// ステータスチェック
async function checkStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        updateStatusDisplay(status);
        
        // 実行完了またはエラー時は監視を停止
        if (!status.running) {
            stopStatusMonitoring();
            resetExecuteButton();
        }
    } catch (error) {
        console.error('Status check failed:', error);
    }
}

// ステータス表示を更新
function updateStatusDisplay(status) {
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const resultsSection = document.getElementById('resultsSection');
    const errorSection = document.getElementById('errorSection');
    
    // ステータステキスト更新
    if (status.running) {
        statusText.textContent = '実行中';
        statusText.className = 'badge status-running';
    } else if (status.error) {
        statusText.textContent = 'エラー';
        statusText.className = 'badge status-error';
    } else if (status.result) {
        statusText.textContent = '完了';
        statusText.className = 'badge status-completed';
    } else {
        statusText.textContent = '待機中';
        statusText.className = 'badge status-waiting';
    }
    
    // プログレスバー更新
    progressBar.style.width = status.progress + '%';
    progressBar.textContent = status.progress + '%';
    progressBar.setAttribute('aria-valuenow', status.progress);
    
    // メッセージ更新
    statusMessage.textContent = status.message || 'エージェントを選択して実行してください';
    statusMessage.className = status.running ? 'alert alert-info p-2 executing' : 'alert alert-info p-2';
    
    // 結果表示
    if (status.result) {
        displayResults(status.result);
        resultsSection.style.display = 'block';
    } else {
        resultsSection.style.display = 'none';
    }
    
    // エラー表示
    if (status.error) {
        document.getElementById('errorMessage').textContent = status.error;
        errorSection.style.display = 'block';
    } else {
        errorSection.style.display = 'none';
    }
}

// 結果表示
function displayResults(result) {
    const resultsList = document.getElementById('resultsList');
    
    if (!result.files || result.files.length === 0) {
        resultsList.innerHTML = '<p class="text-muted">結果ファイルが見つかりませんでした</p>';
        return;
    }
    
    resultsList.innerHTML = '';
    
    // 出力パス表示
    const pathDiv = document.createElement('div');
    pathDiv.className = 'mb-2';
    pathDiv.innerHTML = `<strong>出力先:</strong> <code>${result.output_path}</code>`;
    resultsList.appendChild(pathDiv);
    
    // ファイル一覧
    result.files.forEach(filename => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'result-file';
        fileDiv.innerHTML = `
            <span><i class="fas fa-file-alt"></i> ${filename}</span>
            <button class="btn btn-sm btn-outline-primary" onclick="openFile('${result.output_path}', '${filename}')">
                開く
            </button>
        `;
        resultsList.appendChild(fileDiv);
    });
}

// ファイルを開く（模擬実装）
function openFile(path, filename) {
    showMessage(`${filename} を開こうとしました（実装予定）`, 'info');
    // 実際の実装では、ファイルビューアーやダウンロード機能を提供
}

// タスクリセット
async function resetTask() {
    try {
        const response = await fetch('/api/reset');
        const result = await response.json();
        
        if (result.success) {
            stopStatusMonitoring();
            resetExecuteButton();
            
            // フォームをリセット
            document.getElementById('promptInput').value = '';
            document.getElementById('folderPath').value = '';
            document.getElementById('fileInput').value = '';
            uploadedFiles = [];
            displayUploadedFiles();
            
            // ステータスをリセット
            updateStatusDisplay({
                running: false,
                progress: 0,
                message: '',
                result: null,
                error: null
            });
            
            showMessage('リセットしました', 'success');
        }
    } catch (error) {
        showMessage(`リセットエラー: ${error.message}`, 'danger');
    }
}

// 実行ボタンをリセット
function resetExecuteButton() {
    const executeBtn = document.getElementById('executeBtn');
    executeBtn.disabled = false;
    executeBtn.innerHTML = '<i class="fas fa-play"></i> 実行開始';
}

// メッセージ表示
function showMessage(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // 一時的な通知を表示（実装可能）
    const statusMessage = document.getElementById('statusMessage');
    const originalClass = statusMessage.className;
    const originalText = statusMessage.textContent;
    
    statusMessage.className = `alert alert-${type} p-2`;
    statusMessage.textContent = message;
    
    // 3秒後に元に戻す
    setTimeout(() => {
        statusMessage.className = originalClass;
        statusMessage.textContent = originalText;
    }, 3000);
}

// ユーティリティ関数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}