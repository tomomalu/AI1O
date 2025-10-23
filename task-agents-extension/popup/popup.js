// Task Agents Chrome Extension - Main Popup Script

let selectedAgent = null;
let selectedFiles = [];
let outputPath = null;
let outputOption = 'same'; // デフォルトは「入力ファイルと同じフォルダ」

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
    document.getElementById('selectFileBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('File selection button clicked');
        await selectFiles();
    });
    
    // コマンド生成ボタン
    document.getElementById('generateBtn').addEventListener('click', generateCommand);
    
    // コピーボタン
    document.getElementById('copyBtn').addEventListener('click', copyCommand);
    
    // 手動パス追加ボタン
    document.getElementById('addPathBtn').addEventListener('click', addManualPath);
    
    // 出力先選択
    setupOutputSelection();
}

// 出力先選択の設定
function setupOutputSelection() {
    const outputOptions = document.querySelectorAll('input[name="outputOption"]');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const manualOutputPath = document.querySelector('.manual-output-path');
    const manualOutputInput = document.getElementById('manualOutputPath');
    
    // ラジオボタンの変更
    outputOptions.forEach(option => {
        option.addEventListener('change', async (e) => {
            outputOption = e.target.value;
            updateOutputControls();
            
            // フォルダ選択が選ばれた場合、自動的にフォルダピッカーを開く
            if (outputOption === 'folder') {
                await selectOutputFolder();
            }
        });
    });
    
    // フォルダ選択ボタン
    selectFolderBtn.addEventListener('click', selectOutputFolder);
    
    // 手動入力の変更
    manualOutputInput.addEventListener('input', (e) => {
        if (outputOption === 'manual') {
            outputPath = e.target.value.trim() || null;
            updateSelectedOutputDisplay();
        }
    });
    
    // 初期状態の設定
    updateOutputControls();
}

// 出力先コントロールの表示更新
function updateOutputControls() {
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const manualOutputPath = document.querySelector('.manual-output-path');
    
    // 全て非表示にする
    selectFolderBtn.style.display = 'none';
    manualOutputPath.style.display = 'none';
    
    switch(outputOption) {
        case 'folder':
            selectFolderBtn.style.display = 'block';
            // フォルダが選択されていない場合はプレースホルダーを表示
            if (!outputPath) {
                const selectedOutputDiv = document.getElementById('selectedOutputPath');
                selectedOutputDiv.textContent = '📁 フォルダを選択してください';
                selectedOutputDiv.style.color = '#6c757d';
            }
            break;
        case 'manual':
            manualOutputPath.style.display = 'block';
            break;
        case 'same':
        default:
            // 何も表示しない
            break;
    }
    
    updateSelectedOutputDisplay();
}

// 出力フォルダ選択（Finder風UI）
async function selectOutputFolder() {
    // フォルダ階層データ
    const folderStructure = {
        'よく使う項目': [
            { name: '📁 Desktop', path: '/Users/tomomalu/Desktop', icon: '🖥️' },
            { name: '📁 Downloads', path: '/Users/tomomalu/Downloads', icon: '⬇️' },
            { name: '📁 Documents', path: '/Users/tomomalu/Documents', icon: '📄' }
        ],
        'AI1O プロジェクト': [
            { name: '📁 task-agents output', path: '/Volumes/SSD-PROJECT/AI1O/task-agents/output', icon: '🤖' },
            { name: '📁 task-agents project', path: '/Volumes/SSD-PROJECT/AI1O/project', icon: '🛠️' },
            { name: '📁 AI1O root', path: '/Volumes/SSD-PROJECT/AI1O', icon: '🏠' }
        ],
        'その他': [
            { name: '✏️ 手動でパスを入力', path: null, icon: '✏️' }
        ]
    };
    
    // Finder風ダイアログを表示
    showFinderStyleDialog(folderStructure);
}

// Finder風フォルダ選択ダイアログ
function showFinderStyleDialog(folderStructure) {
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('folderSelectionDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // ダイアログを作成
    const dialog = document.createElement('div');
    dialog.id = 'folderSelectionDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    
    // ヘッダー
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 16px 20px;
        border-bottom: 1px solid #e5e5e5;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    header.innerHTML = `
        <span style="font-size: 18px;">📁</span>
        <span style="font-weight: 600; font-size: 16px;">出力フォルダを選択</span>
    `;
    
    // コンテンツエリア
    const content = document.createElement('div');
    content.style.cssText = `
        display: flex;
        height: 280px;
    `;
    
    // サイドバー
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
        width: 150px;
        border-right: 1px solid #e5e5e5;
        background: #f8f9fa;
        overflow-y: auto;
    `;
    
    // メインエリア
    const mainArea = document.createElement('div');
    mainArea.style.cssText = `
        flex: 1;
        padding: 12px;
        overflow-y: auto;
    `;
    
    // フッター
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 12px 20px;
        border-top: 1px solid #e5e5e5;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    `;
    footer.innerHTML = `
        <button id="cancelFolderBtn" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 6px; cursor: pointer;">キャンセル</button>
        <button id="selectFolderBtn" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 6px; cursor: pointer;" disabled>選択</button>
    `;
    
    dialogContent.appendChild(header);
    content.appendChild(sidebar);
    content.appendChild(mainArea);
    dialogContent.appendChild(content);
    dialogContent.appendChild(footer);
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    let selectedOption = null;
    let currentCategory = null;
    
    // サイドバーを構築
    Object.keys(folderStructure).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.cssText = `
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            color: #666;
            border-bottom: 1px solid #e5e5e5;
            cursor: pointer;
            transition: background 0.2s;
        `;
        categoryDiv.textContent = category;
        
        categoryDiv.addEventListener('click', () => {
            // サイドバーの選択状態を更新
            sidebar.querySelectorAll('div').forEach(div => {
                div.style.background = '#f8f9fa';
                div.style.color = '#666';
            });
            categoryDiv.style.background = '#007bff';
            categoryDiv.style.color = 'white';
            
            // メインエリアを更新
            currentCategory = category;
            showFoldersInCategory(folderStructure[category], mainArea);
        });
        
        // 最初のカテゴリを自動選択
        if (currentCategory === null) {
            currentCategory = category;
            categoryDiv.style.background = '#007bff';
            categoryDiv.style.color = 'white';
            showFoldersInCategory(folderStructure[category], mainArea);
        }
        
        sidebar.appendChild(categoryDiv);
    });
    
    function showFoldersInCategory(folders, container) {
        container.innerHTML = '';
        
        folders.forEach(folder => {
            const folderDiv = document.createElement('div');
            folderDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            folderDiv.innerHTML = `
                <span style="font-size: 20px;">${folder.icon}</span>
                <div>
                    <div style="font-weight: 500; font-size: 14px;">${folder.name}</div>
                    <div style="font-size: 11px; color: #666;">${folder.path || '手動入力'}</div>
                </div>
            `;
            
            folderDiv.addEventListener('click', () => {
                // 選択状態を更新
                container.querySelectorAll('div').forEach(div => {
                    div.style.background = '';
                    div.style.borderColor = '#e5e5e5';
                });
                folderDiv.style.background = '#e7f1ff';
                folderDiv.style.borderColor = '#007bff';
                
                selectedOption = folder;
                dialog.querySelector('#selectFolderBtn').disabled = false;
            });
            
            // ダブルクリックで決定
            folderDiv.addEventListener('dblclick', () => {
                selectFolder(folder, dialog);
            });
            
            container.appendChild(folderDiv);
        });
    }
    
    // イベントリスナー
    dialog.querySelector('#cancelFolderBtn').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('#selectFolderBtn').addEventListener('click', () => {
        if (selectedOption) {
            selectFolder(selectedOption, dialog);
        }
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

function selectFolder(folder, dialog) {
    if (folder.path) {
        outputPath = folder.path;
        showStatus(`フォルダを選択しました: ${folder.name}`, 'success');
        updateSelectedOutputDisplay();
    } else {
        // 手動入力モードに切り替え
        const manualRadio = document.getElementById('outputManual');
        if (manualRadio) {
            manualRadio.checked = true;
            outputOption = 'manual';
            updateOutputControls();
            showStatus('手動入力モードに切り替えました', 'info');
        }
    }
    dialog.remove();
}


// 選択された出力先の表示更新
function updateSelectedOutputDisplay() {
    const selectedOutputDiv = document.getElementById('selectedOutputPath');
    
    // 色をリセット
    selectedOutputDiv.style.color = '';
    
    switch(outputOption) {
        case 'folder':
            if (outputPath) {
                selectedOutputDiv.textContent = `📁 ${outputPath}`;
            } else {
                selectedOutputDiv.textContent = '📁 フォルダを選択してください';
                selectedOutputDiv.style.color = '#6c757d';
            }
            break;
        case 'manual':
            if (outputPath) {
                selectedOutputDiv.textContent = `📝 ${outputPath}`;
            } else {
                selectedOutputDiv.textContent = '';
            }
            break;
        case 'same':
            if (selectedFiles.length > 0) {
                const firstFilePath = selectedFiles[0].path;
                const directory = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'));
                selectedOutputDiv.textContent = `📍 ${directory}`;
            } else {
                selectedOutputDiv.textContent = '📍 入力ファイルと同じフォルダ';
            }
            break;
        default:
            selectedOutputDiv.textContent = '';
    }
}

// ファイル選択（File System Access API使用）
async function selectFiles() {
    try {
        // File System Access API が利用可能かチェック
        if (!window.showOpenFilePicker) {
            throw new Error('File System Access API is not supported in this browser');
        }
        
        console.log('Starting file selection...');
        
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
        updateSelectedOutputDisplay(); // 出力先表示を更新
        showStatus(`${selectedFiles.length}個のファイルを選択しました`, 'success');
        
    } catch (error) {
        console.error('File selection error:', error.name, error.message);
        
        if (error.name === 'AbortError') {
            // ユーザーがキャンセルした場合
            console.log('User cancelled file selection');
            return;
        } else if (error.name === 'NotAllowedError') {
            console.error('File selection not allowed:', error.message);
            showStatus('ファイル選択が許可されていません。ボタンを直接クリックしてください', 'error');
        } else {
            console.error('Unexpected file selection error:', error);
            showStatus('ファイル選択でエラーが発生しました', 'error');
        }
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
            updateSelectedOutputDisplay(); // 出力先表示を更新
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
    
    // 出力パスを決定
    let finalOutputPath = 'output'; // デフォルト
    
    switch(outputOption) {
        case 'folder':
            if (outputPath) {
                finalOutputPath = outputPath;
            }
            break;
        case 'manual':
            if (outputPath) {
                finalOutputPath = outputPath;
            }
            break;
        case 'same':
            if (selectedFiles.length > 0) {
                const firstFilePath = selectedFiles[0].path;
                const directory = firstFilePath.substring(0, firstFilePath.lastIndexOf('/'));
                finalOutputPath = directory;
            }
            break;
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
    commandParts.push(`Output path: ${finalOutputPath}`);
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