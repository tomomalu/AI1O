// Task Agents Chrome Extension - Main Popup Script

let selectedAgent = null;
let selectedFiles = [];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Task Agents Extension initialized');
    
    // エージェントリストを生成
    renderAgentList();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // ドラッグ&ドロップを設定
    setupDropZone();
    
    showStatus('エージェントを選択してください', 'info');
});

// エージェントリストを表示
function renderAgentList() {
    const agentList = document.getElementById('agentList');
    const agents = getAvailableAgents();
    
    agentList.innerHTML = '';
    
    agents.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        agentItem.addEventListener('click', () => selectAgent(agent.name));
        
        agentItem.innerHTML = `
            <input type="radio" name="agent" value="${agent.name}" class="agent-radio">
            <div class="agent-info">
                <div class="agent-name">${agent.displayName}</div>
                <div class="agent-description">${agent.description}</div>
            </div>
        `;
        
        agentList.appendChild(agentItem);
    });
}

// エージェント選択
function selectAgent(agentName) {
    selectedAgent = agentName;
    
    // UIを更新
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`input[value="${agentName}"]`).closest('.agent-item');
    selectedItem.classList.add('selected');
    
    // ラジオボタンをチェック
    document.querySelector(`input[value="${agentName}"]`).checked = true;
    
    // プロンプトテンプレートを自動入力
    const template = getAgentTemplate(agentName);
    if (template) {
        document.getElementById('promptInput').value = template.template;
        showStatus(`${template.displayName} を選択しました`, 'success');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // ファイル選択ボタン
    document.getElementById('selectFileBtn').addEventListener('click', selectFiles);
    
    // コマンド生成ボタン
    document.getElementById('generateBtn').addEventListener('click', generateCommand);
    
    // コピーボタン
    document.getElementById('copyBtn').addEventListener('click', copyCommand);
    
    // 手動パス追加ボタン
    document.getElementById('addPathBtn').addEventListener('click', addManualPath);
}

// ファイル選択（File System Access API使用）
async function selectFiles() {
    try {
        // File System Access API を使用
        const fileHandles = await window.showOpenFilePicker({
            multiple: true,
            types: [
                {
                    description: 'Text files',
                    accept: {
                        'text/*': ['.txt', '.md', '.json', '.csv'],
                        'application/*': ['.pdf', '.docx']
                    }
                }
            ]
        });
        
        selectedFiles = [];
        
        for (const fileHandle of fileHandles) {
            const file = await fileHandle.getFile();
            
            // ファイルパスを取得（拡張機能の特権を利用）
            let filePath = '';
            if (fileHandle.name) {
                // 可能な限りフルパスを構築
                filePath = await getFileFullPath(fileHandle, file);
            }
            
            selectedFiles.push({
                handle: fileHandle,
                file: file,
                name: file.name,
                path: filePath || file.name,
                size: file.size
            });
        }
        
        displaySelectedFiles();
        showStatus(`${selectedFiles.length}個のファイルを選択しました`, 'success');
        
    } catch (error) {
        console.error('File selection error:', error);
        showStatus('ファイル選択がキャンセルされました', 'info');
    }
}

// ファイルのフルパスを取得
async function getFileFullPath(fileHandle, file) {
    console.log('Selected file:', file.name, 'Size:', file.size);
    
    try {
        console.log('Sending message to background:', file.name);
        
        // Native Messaging でファイルパスを取得
        const response = await chrome.runtime.sendMessage({
            action: "getFilePathFromNative",
            filename: file.name
        });
        
        console.log('Native messaging response:', response);
        
        if (response && response.success) {
            showStatus(`ファイルパスを自動取得しました: ${file.name}`, 'success');
            return response.path;
        } else {
            console.warn('Native messaging failed:', response?.error);
            showStatus(`ファイルパス自動取得に失敗: ${file.name}`, 'warning');
            return `📁 ${file.name} (手動でパスを入力してください)`;
        }
    } catch (error) {
        console.error('Native messaging error:', error);
        showStatus(`ファイルパス取得エラー: ${file.name}`, 'warning');
        return `📁 ${file.name} (手動でパスを入力してください)`;
    }
}

// 選択されたファイルを表示
function displaySelectedFiles() {
    const selectedFilesDiv = document.getElementById('selectedFiles');
    
    if (selectedFiles.length === 0) {
        selectedFilesDiv.innerHTML = '';
        return;
    }
    
    selectedFilesDiv.innerHTML = selectedFiles.map((fileInfo, index) => `
        <div class="file-item">
            <span class="file-path">📄 ${fileInfo.path}</span>
            <button class="file-remove" data-index="${index}">✕</button>
        </div>
    `).join('');
    
    // ファイル削除ボタンのイベントリスナーを設定
    selectedFilesDiv.querySelectorAll('.file-remove').forEach((button, index) => {
        button.addEventListener('click', () => removeFile(parseInt(button.dataset.index)));
    });
}

// ファイルを削除
function removeFile(index) {
    selectedFiles.splice(index, 1);
    displaySelectedFiles();
    showStatus('ファイルを削除しました', 'info');
}

// ドラッグ&ドロップ設定
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        
        if (files.length > 0) {
            selectedFiles = [];
            
            for (const file of files) {
                const filePath = await generatePathFromFile(file);
                selectedFiles.push({
                    file: file,
                    name: file.name,
                    path: filePath,
                    size: file.size
                });
            }
            
            displaySelectedFiles();
            showStatus(`${files.length}個のファイルをドロップしました`, 'success');
        }
    });
}

// ファイルから推測パスを生成
async function generatePathFromFile(file) {
    console.log('Dropped file:', file.name, 'Size:', file.size);
    
    try {
        console.log('Sending message to background for dropped file:', file.name);
        
        // Native Messaging でファイルパスを取得
        const response = await chrome.runtime.sendMessage({
            action: "getFilePathFromNative",
            filename: file.name
        });
        
        console.log('Native messaging response for dropped file:', response);
        
        if (response && response.success) {
            showStatus(`ドロップファイルのパスを自動取得しました: ${file.name}`, 'success');
            return response.path;
        } else {
            console.warn('Native messaging failed for dropped file:', response?.error);
            showStatus(`ドロップファイルのパス自動取得に失敗: ${file.name}`, 'warning');
            return `📁 ${file.name} (手動でパスを入力してください)`;
        }
    } catch (error) {
        console.error('Native messaging error for dropped file:', error);
        showStatus(`ドロップファイルのパス取得エラー: ${file.name}`, 'warning');
        return `📁 ${file.name} (手動でパスを入力してください)`;
    }
}

// 手動パス追加
function addManualPath() {
    const pathInput = document.getElementById('manualPath');
    const path = pathInput.value.trim();
    
    if (!path) {
        showStatus('パスを入力してください', 'error');
        return;
    }
    
    // パスからファイル名を抽出
    const fileName = path.split('/').pop();
    
    selectedFiles.push({
        name: fileName,
        path: path,
        size: 0,
        manual: true
    });
    
    pathInput.value = '';
    displaySelectedFiles();
    showStatus('パスを追加しました', 'success');
}

// Claude Codeコマンド生成
function generateCommand() {
    if (!selectedAgent) {
        showStatus('エージェントを選択してください', 'error');
        return;
    }
    
    const prompt = document.getElementById('promptInput').value.trim();
    if (!prompt) {
        showStatus('プロンプトを入力してください', 'error');
        return;
    }
    
    // コマンド文字列を生成
    const commandParts = [
        'Task tool:',
        `subagent_type: ${selectedAgent}`,
        '',
        'Prompt:',
        `"${prompt}"`
    ];
    
    if (selectedFiles.length > 0) {
        commandParts.push('');
        commandParts.push('Input files:');
        selectedFiles.forEach(fileInfo => {
            commandParts.push(`- ${fileInfo.path}`);
        });
    }
    
    commandParts.push('');
    commandParts.push('Output path: output');
    commandParts.push('');
    commandParts.push('💡 使い方:');
    commandParts.push('1. 上記の内容をClaude Codeにコピペしてください');
    commandParts.push('2. Task toolを使用してエージェントを実行してください');
    commandParts.push('3. 実行完了後、結果を確認してください');
    
    const command = commandParts.join('\n');
    
    // UI表示
    document.getElementById('commandText').textContent = command;
    document.getElementById('commandOutput').style.display = 'block';
    
    showStatus('コマンドを生成しました！', 'success');
}

// コマンドをクリップボードにコピー
async function copyCommand() {
    const commandText = document.getElementById('commandText').textContent;
    
    try {
        await navigator.clipboard.writeText(commandText);
        showStatus('クリップボードにコピーしました！', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('コピーに失敗しました', 'error');
    }
}

// ステータス表示
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type} show`;
    
    setTimeout(() => {
        status.classList.remove('show');
    }, 3000);
}

// ユーティリティ関数
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
}