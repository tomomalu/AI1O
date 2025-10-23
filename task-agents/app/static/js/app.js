// AI1O Agent Web App JavaScript - New Copy/Paste Flow

let uploadedFiles = [];
let currentCommandData = null;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI1O Agent Web App initialized (Copy/Paste Mode)');
    
    // ファイルアップロードのイベントリスナー
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // 初期状態を設定
    updateStatus('waiting', 'エージェントを選択して「実行準備」をクリックしてください');
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

// 実行準備（新しいメイン機能）
async function prepareExecution() {
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
        // 準備ボタンを無効化
        const prepareBtn = document.getElementById('prepareBtn');
        prepareBtn.disabled = true;
        prepareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 準備中...';
        
        updateStatus('preparing', 'Claude Codeコマンドを生成中...');
        
        const response = await fetch('/api/prepare', {
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
            currentCommandData = result.command_data;
            displayCommand(result.command_data);
            updateStatus('ready', 'Claude Codeコマンドを生成しました。コピーして実行してください。');
        } else {
            showMessage(`準備エラー: ${result.error}`, 'danger');
            updateStatus('error', `エラー: ${result.error}`);
        }
    } catch (error) {
        showMessage(`準備エラー: ${error.message}`, 'danger');
        updateStatus('error', `エラー: ${error.message}`);
    } finally {
        resetPrepareButton();
    }
}

// コマンド表示
function displayCommand(commandData) {
    const commandSection = document.getElementById('commandSection');
    const commandDisplay = document.getElementById('commandDisplay');
    
    commandDisplay.value = commandData.command;
    commandSection.style.display = 'block';
}

// コマンドをクリップボードにコピー
async function copyCommand() {
    const commandDisplay = document.getElementById('commandDisplay');
    
    try {
        await navigator.clipboard.writeText(commandDisplay.value);
        showMessage('コマンドをクリップボードにコピーしました', 'success');
        
        // コピーボタンの状態を一時的に変更
        const copyBtn = event.target.closest('button');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> コピー済み';
        copyBtn.classList.remove('btn-outline-primary');
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-primary');
        }, 2000);
        
    } catch (error) {
        showMessage('コピーに失敗しました。手動でコピーしてください。', 'warning');
    }
}

// 実行済みマーク
function markExecuted() {
    updateStatus('executed', 'Claude Codeで実行中です。完了後に結果をアップロードしてください。');
    
    // アップロードセクションを表示
    const uploadSection = document.getElementById('uploadSection');
    uploadSection.style.display = 'block';
    
    showMessage('実行ステータスを更新しました。結果ファイルをアップロードしてください。', 'info');
}

// 結果アップロード
async function uploadResults() {
    const resultFiles = document.getElementById('resultFiles');
    const files = resultFiles.files;
    
    if (files.length === 0) {
        showMessage('結果ファイルを選択してください', 'warning');
        return;
    }
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('result_files', files[i]);
    }
    
    try {
        showMessage('結果をアップロード中...', 'info');
        
        const response = await fetch('/api/upload_result', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayResults(result);
            updateStatus('completed', '結果アップロードが完了しました！');
            showMessage(`${result.uploaded_files.length}個のファイルをアップロードしました`, 'success');
            
            // アップロードセクションを非表示
            const uploadSection = document.getElementById('uploadSection');
            uploadSection.style.display = 'none';
        } else {
            showMessage(`アップロードエラー: ${result.error}`, 'danger');
        }
    } catch (error) {
        showMessage(`アップロードエラー: ${error.message}`, 'danger');
    }
}

// 結果表示
function displayResults(result) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    
    resultsList.innerHTML = '';
    
    if (result.result_folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'mb-2';
        folderDiv.innerHTML = `<strong>保存先:</strong> <code>${result.result_folder}</code>`;
        resultsList.appendChild(folderDiv);
    }
    
    // ファイル一覧
    result.uploaded_files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'result-file mb-2 p-2 border rounded';
        fileDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span><i class="fas fa-file-alt"></i> ${file.filename}</span>
                <small class="text-muted">${formatFileSize(file.size)}</small>
            </div>
        `;
        resultsList.appendChild(fileDiv);
    });
    
    resultsSection.style.display = 'block';
}

// ステータス更新
function updateStatus(status, message) {
    const statusText = document.getElementById('statusText');
    const statusMessage = document.getElementById('statusMessage');
    
    // ステータステキスト更新
    statusText.className = 'badge';
    
    switch (status) {
        case 'waiting':
            statusText.textContent = '待機中';
            statusText.classList.add('bg-secondary');
            break;
        case 'preparing':
            statusText.textContent = '準備中';
            statusText.classList.add('bg-warning');
            break;
        case 'ready':
            statusText.textContent = '実行準備完了';
            statusText.classList.add('bg-primary');
            break;
        case 'executed':
            statusText.textContent = 'Claude Code実行中';
            statusText.classList.add('bg-info');
            break;
        case 'completed':
            statusText.textContent = '完了';
            statusText.classList.add('bg-success');
            break;
        case 'error':
            statusText.textContent = 'エラー';
            statusText.classList.add('bg-danger');
            break;
    }
    
    // メッセージ更新
    statusMessage.textContent = message;
    statusMessage.className = 'alert p-2';
    
    if (status === 'error') {
        statusMessage.classList.add('alert-danger');
    } else if (status === 'completed') {
        statusMessage.classList.add('alert-success');
    } else if (status === 'ready') {
        statusMessage.classList.add('alert-primary');
    } else {
        statusMessage.classList.add('alert-info');
    }
}

// タスクリセット
async function resetTask() {
    // 状態をリセット
    currentCommandData = null;
    
    // UI要素をリセット
    document.getElementById('promptInput').value = '';
    document.getElementById('folderPath').value = '';
    document.getElementById('fileInput').value = '';
    uploadedFiles = [];
    displayUploadedFiles();
    
    // セクションを非表示
    document.getElementById('commandSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    
    // ステータスをリセット
    updateStatus('waiting', 'エージェントを選択して「実行準備」をクリックしてください');
    
    showMessage('リセットしました', 'success');
}

// 準備ボタンをリセット
function resetPrepareButton() {
    const prepareBtn = document.getElementById('prepareBtn');
    prepareBtn.disabled = false;
    prepareBtn.innerHTML = '<i class="fas fa-cog"></i> 実行準備';
}

// メッセージ表示
function showMessage(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // 一時的な通知を表示
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