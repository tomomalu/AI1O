// AI1O Agent Web App JavaScript - New Copy/Paste Flow

let uploadedFiles = [];
let currentCommandData = null;

// エージェント別プロンプトテンプレート
const agentPromptTemplates = {
    'task-product-feature-doc-creator': `【機能名】機能の企画書を作成してください。

機能の概要：
- 

開発期間：ヶ月
プロジェクト体制：

参考資料：
- `,
    
    'task-ui-sketch-creator': `「【機能名】」機能のUIスケッチを作成してください。

主要画面：
- 
- 
- 

ターゲットユーザー：
要件：
- `,
    
    'task-ui-wireframe-creator': `「【機能名】」機能のワイヤーフレームを作成してください。

画面仕様：
- 
- 

機能要件：
- 
- 

デザイン要件：
- `,
    
    'ui-sketch-creator': `「【機能名】」機能のUIスケッチを作成してください。

主要画面：
- 
- 
- 

ターゲットユーザー：
要件：
- `,
    
    'job-customer-success': `カスタマーサクセス業務について以下の内容でサポートしてください：

課題・目標：


顧客情報：
- 

実施項目：
- `,
    
    'job-field-sales': `フィールドセールス業務について以下の内容でサポートしてください：

営業目標：


ターゲット顧客：
- 

アプローチ方法：
- `,
    
    'ui-sketch-json-creator': `ASCIIワイヤーフレームをJSONに変換してください。

既存のASCIIファイル：

対象機能：
変換要件：
- `
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI1O Agent Web App initialized (Copy/Paste Mode)');
    
    // ファイルアップロードのイベントリスナー
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // エージェント選択のイベントリスナー（radio buttonに対応）
    const agentRadios = document.querySelectorAll('input[name="agent"]');
    agentRadios.forEach(radio => {
        radio.addEventListener('change', handleAgentSelection);
    });
    
    // ドラッグ&ドロップのイベントリスナー
    setupDropZone();
    
    // 初期状態を設定
    updateStatus('waiting', 'エージェントを選択して「実行準備」をクリックしてください');
});

// エージェント選択時の処理
function handleAgentSelection() {
    const promptTextarea = document.getElementById('promptInput');
    const selectedRadio = document.querySelector('input[name="agent"]:checked');
    const selectedAgent = selectedRadio ? selectedRadio.value : null;
    
    if (selectedAgent && agentPromptTemplates[selectedAgent]) {
        // プロンプトテンプレートを自動入力
        promptTextarea.value = agentPromptTemplates[selectedAgent];
        console.log(`Agent template loaded: ${selectedAgent}`);
    } else if (!selectedAgent) {
        // エージェント未選択時はクリア
        promptTextarea.value = '';
    } else {
        // テンプレートが見つからない場合はデフォルトメッセージ
        promptTextarea.value = 'エージェントに実行してほしい内容を詳しく入力してください...';
    }
}

// ファイル選択処理（パス確認用）
function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        // ファイル選択をクリアした場合
        uploadedFiles = [];
        displayUploadedFiles();
        return;
    }
    
    // 選択されたファイル名を表示（パス入力の参考用）
    uploadedFiles = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // ファイル名のみ表示（ユーザーがパスを手動入力する参考用）
        uploadedFiles.push(`📝 ${file.name} → 上のパス欄に絶対パスを入力`);
    }
    
    displayUploadedFiles();
    showMessage(`${files.length}個のファイルを選択しました。上のパス指定欄に絶対パスを入力してください`, 'info');
}

// ドラッグ&ドロップゾーンのセットアップ
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const folderPathInput = document.getElementById('folderPath');
    
    if (!dropZone) return;
    
    // ドラッグオーバー時の処理
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.backgroundColor = '#e3f2fd';
        dropZone.style.borderColor = '#2196f3';
    });
    
    // ドラッグリーブ時の処理
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.backgroundColor = '#f8f9fa';
        dropZone.style.borderColor = '#dee2e6';
    });
    
    // ドロップ時の処理
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // スタイルをリセット
        dropZone.style.backgroundColor = '#f8f9fa';
        dropZone.style.borderColor = '#dee2e6';
        
        const files = e.dataTransfer.files;
        
        if (files.length > 0) {
            const file = files[0]; // 最初のファイルを処理
            
            // ファイルパスの取得・推測を試行
            let filePath = '';
            
            // デバッグ情報をコンソールに出力
            console.log('File details:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified),
                webkitRelativePath: file.webkitRelativePath,
                path: file.path
            });
            
            // 様々な方法でパス取得を試行
            if (file.path) {
                // Electronアプリの場合
                filePath = file.path;
            } else if (file.webkitRelativePath) {
                // webkitRelativePathがある場合
                filePath = file.webkitRelativePath;
            } else if (e.dataTransfer && e.dataTransfer.items) {
                // DataTransferItemからパスを試行取得
                const item = e.dataTransfer.items[0];
                console.log('DataTransfer item:', item);
                
                if (item.webkitGetAsEntry) {
                    const entry = item.webkitGetAsEntry();
                    console.log('File entry:', entry);
                    if (entry && entry.fullPath) {
                        // fullPathが完全パスでない場合（/filename.mdのような場合）は推測パスを使用
                        if (entry.fullPath.split('/').length <= 2) {
                            console.log('Partial path detected:', entry.fullPath);
                            filePath = ''; // 推測パス生成に回す
                        } else {
                            filePath = entry.fullPath;
                        }
                    }
                }
            }
            
            // パスが取得できない場合、ファイル名と属性から推測パスを生成
            if (!filePath || filePath === file.name || filePath.startsWith('/') && filePath.split('/').length <= 2) {
                console.log('Generating possible paths for:', file.name);
                filePath = generatePossiblePaths(file);
                console.log('Generated path:', filePath);
            }
            
            // パス入力欄に設定
            if (filePath && (filePath.startsWith('/') || filePath.includes(':'))) {
                folderPathInput.value = filePath;
                showMessage('ファイルパスを取得しました！', 'success');
            } else {
                // フルパスが取得できない場合は、ファイル名だけ表示してクリア
                folderPathInput.value = '';
                showMessage(`${file.name} をドロップしました。上の欄に正確なフルパスを手動入力してください`, 'info');
            }
            
            // 選択ファイル表示も更新（パス入力欄の値を使用）
            const displayPath = folderPathInput.value || `🎯 ${file.name}`;
            uploadedFiles = [displayPath];
            displayUploadedFiles();
        }
    });
}

// ファイル情報から推測可能なパスを生成
function generatePossiblePaths(file) {
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // よくあるパスパターンを推測
    const commonPaths = [
        `/Users/${getUserName()}/Desktop/${fileName}`,
        `/Users/${getUserName()}/Downloads/${fileName}`,
        `/Users/${getUserName()}/Documents/${fileName}`,
        `/Volumes/SSD-PROJECT/AI1O/task-agents/output/ui-sketch-creator/20251023_AI-error-resolver/${fileName}`,
        `/Volumes/SSD-PROJECT/AI1O/task-agents/output/ui-sketch-json-creator/20251023_AI-error-resolver/${fileName}`,
        `/Volumes/SSD-PROJECT/AI1O/project/AIエラー解決/${fileName}`
    ];
    
    // 拡張子に基づいた推測
    if (fileExt === 'md') {
        commonPaths.unshift(
            `/Volumes/SSD-PROJECT/AI1O/task-agents/output/ui-sketch-creator/20251023_AI-error-resolver/${fileName}`,
            `/Volumes/SSD-PROJECT/AI1O/project/AIエラー解決/${fileName}`
        );
    } else if (fileExt === 'json') {
        commonPaths.unshift(
            `/Volumes/SSD-PROJECT/AI1O/task-agents/output/ui-sketch-json-creator/20251023_AI-error-resolver/${fileName}`
        );
    }
    
    return commonPaths[0]; // 最も可能性の高いパスを返す
}

// ユーザー名を推測（環境変数やブラウザ情報から）
function getUserName() {
    // macOSでよくあるユーザー名パターン
    return 'tomomalu'; // 実際のユーザー名に基づいて設定
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