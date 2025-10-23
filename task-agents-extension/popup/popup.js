// Task Agents Chrome Extension - Main Popup Script

let selectedAgent = null;
let selectedFiles = [];
let outputPath = null;
let outputOption = 'same'; // デフォルトは「入力ファイルと同じフォルダ」
let availableAgents = []; // 動的に読み込まれるエージェント一覧

// 履歴管理用の変数
let executionHistory = [];
const MAX_HISTORY_ITEMS = 50; // 最大保存件数

// 履歴データ構造定義
function createHistoryItem(agent, files, prompt, outputPath, outputOption, generatedCommand) {
    return {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        agent: {
            name: agent.name,
            displayName: agent.displayName,
            description: agent.description
        },
        files: files.map(file => ({
            name: file.name,
            path: file.path,
            size: file.size
        })),
        prompt: prompt,
        outputPath: outputPath,
        outputOption: outputOption,
        generatedCommand: generatedCommand
    };
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Task Agents Extension initialized');
    
    // エージェントリストを動的に読み込み
    loadAgents();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // ドラッグ&ドロップを設定
    setupDropZone();
    
    // 保存された状態を復元
    restoreState();
    
    // 履歴を読み込み
    loadExecutionHistory();
    
    showStatus('エージェントを読み込み中...', 'info');
});

// エージェントを動的に読み込み
async function loadAgents() {
    try {
        console.log('🤖 Loading agents from /Volumes/SSD-PROJECT/AI1O/agents...');
        
        // Native Messaging でエージェントを取得
        const response = await chrome.runtime.sendMessage({
            action: "getAgentsFromNative"
        });
        
        console.log('Agents response:', response);
        
        if (response && response.success) {
            availableAgents = response.agents;
            console.log(`✅ Loaded ${availableAgents.length} agents:`, availableAgents);
            renderAgentList();
            showStatus(`${availableAgents.length}個のエージェントを読み込みました`, 'success');
        } else {
            console.error('❌ Failed to load agents:', response?.error);
            // フォールバック: 静的エージェントを使用
            loadFallbackAgents();
            showStatus('エージェント読み込みに失敗。デフォルトエージェントを使用します。', 'warning');
        }
    } catch (error) {
        console.error('💥 Error loading agents:', error);
        // フォールバック: 静的エージェントを使用
        loadFallbackAgents();
        showStatus('エージェント読み込みエラー。デフォルトエージェントを使用します。', 'error');
    }
}

// フォールバック用の静的エージェント
function loadFallbackAgents() {
    availableAgents = [
        {
            name: 'task-product-feature-doc-creator',
            displayName: 'プロダクト機能ドキュメント作成',
            description: '製品機能の企画書・仕様書を作成します',
            template: `【機能名】機能の企画書を作成してください。

機能の概要：
- 

開発期間：ヶ月
プロジェクト体制：

参考資料：
- `,
            type: 'fallback'
        },
        {
            name: 'task-ui-sketch-creator',
            displayName: 'UIスケッチ作成',
            description: 'ユーザーインターフェースのスケッチを作成します',
            template: `「【機能名】」機能のUIスケッチを作成してください。

主要画面：
- 
- 
- `,
            type: 'fallback'
        }
    ];
    renderAgentList();
}

// エージェントリストを表示
function renderAgentList() {
    const agentList = document.getElementById('agentList');
    
    if (availableAgents.length === 0) {
        agentList.innerHTML = '<div class="no-agents">エージェントが見つかりません</div>';
        return;
    }
    
    agentList.innerHTML = '';
    
    availableAgents.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        agentItem.addEventListener('click', () => selectAgent(agent.name));
        
        // エージェントタイプに応じてバッジを表示
        const typeBadge = agent.type === 'folder' ? '📁' : 
                         agent.type === 'file' ? '📄' : 
                         '⚙️';
        
        agentItem.innerHTML = `
            <input type="radio" name="agent" value="${agent.name}" class="agent-radio">
            <div class="agent-info">
                <div class="agent-name">${typeBadge} ${agent.displayName}</div>
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
    
    // プロンプトテンプレートを表示（ユーザーが編集可能）
    const agent = availableAgents.find(a => a.name === agentName);
    if (agent) {
        document.getElementById('promptInput').value = agent.template;
        document.getElementById('promptInput').placeholder = `${agent.displayName}への指示を入力してください...`;
        showStatus(`${agent.displayName} を選択しました`, 'success');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // タブ切り替え
    setupTabNavigation();
    
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
    
    // 別ウィンドウボタン
    setupWindowButton();
    
    // 履歴関連
    setupHistoryEventListeners();
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

// 別ウィンドウボタンの設定
function setupWindowButton() {
    const windowBtn = document.getElementById('openInWindowBtn');
    if (windowBtn) {
        windowBtn.addEventListener('click', openInNewWindow);
    }
}

// 別ウィンドウで開く
async function openInNewWindow() {
    try {
        // 現在のページの状態を保存（選択されたエージェント、ファイル、プロンプトなど）
        const currentState = {
            selectedAgent: selectedAgent,
            selectedFiles: selectedFiles,
            outputPath: outputPath,
            outputOption: outputOption,
            promptValue: document.getElementById('promptInput').value
        };
        
        // ローカルストレージに状態を保存
        await chrome.storage.local.set({ 'taskAgentsState': currentState });
        
        // 新しいウィンドウを開く（background scriptに要求）
        chrome.runtime.sendMessage({
            action: 'openInWindow',
            url: chrome.runtime.getURL('popup/popup.html')
        });
        
        showStatus('別ウィンドウで開いています...', 'info');
        
    } catch (error) {
        console.error('Error opening in new window:', error);
        showStatus('別ウィンドウを開けませんでした', 'error');
    }
}

// ページ読み込み時に保存された状態を復元
async function restoreState() {
    try {
        const result = await chrome.storage.local.get(['taskAgentsState']);
        if (result.taskAgentsState) {
            const state = result.taskAgentsState;
            
            // 状態を復元
            if (state.selectedAgent) {
                // エージェントが読み込まれるまで待機
                setTimeout(() => {
                    selectAgent(state.selectedAgent);
                }, 500);
            }
            
            if (state.selectedFiles) {
                selectedFiles = state.selectedFiles;
                displaySelectedFiles();
            }
            
            if (state.outputPath) {
                outputPath = state.outputPath;
            }
            
            if (state.outputOption) {
                outputOption = state.outputOption;
                updateOutputControls();
            }
            
            if (state.promptValue) {
                document.getElementById('promptInput').value = state.promptValue;
            }
            
            // 状態をクリア
            await chrome.storage.local.remove(['taskAgentsState']);
        }
    } catch (error) {
        console.error('Error restoring state:', error);
    }
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
    
    // 履歴に保存
    const agent = availableAgents.find(a => a.name === selectedAgent);
    if (agent) {
        saveToHistory(agent, selectedFiles, prompt, finalOutputPath, outputOption, command);
    }
    
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

// タブナビゲーション設定
function setupTabNavigation() {
    const agentTab = document.getElementById('agentTab');
    const historyTab = document.getElementById('historyTab');
    const agentContent = document.getElementById('agentContent');
    const historyContent = document.getElementById('historyContent');
    
    agentTab.addEventListener('click', () => {
        switchTab('agent', agentTab, historyTab, agentContent, historyContent);
    });
    
    historyTab.addEventListener('click', () => {
        switchTab('history', agentTab, historyTab, agentContent, historyContent);
        loadHistoryList(); // 履歴タブを開く時に履歴を更新
    });
}

// タブ切り替え
function switchTab(activeTab, agentTab, historyTab, agentContent, historyContent) {
    // タブボタンの状態を更新
    agentTab.classList.remove('active');
    historyTab.classList.remove('active');
    
    // コンテンツの状態を更新
    agentContent.classList.remove('active');
    historyContent.classList.remove('active');
    
    if (activeTab === 'agent') {
        agentTab.classList.add('active');
        agentContent.classList.add('active');
    } else {
        historyTab.classList.add('active');
        historyContent.classList.add('active');
    }
}

// 履歴関連のイベントリスナー設定
function setupHistoryEventListeners() {
    // 詳細モーダルの閉じるボタン
    const closeDetailModal = document.getElementById('closeDetailModal');
    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    const historyDetailModal = document.getElementById('historyDetailModal');
    
    if (closeDetailModal) {
        closeDetailModal.addEventListener('click', () => {
            historyDetailModal.style.display = 'none';
        });
    }
    
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', () => {
            historyDetailModal.style.display = 'none';
        });
    }
    
    // モーダル外クリックで閉じる
    if (historyDetailModal) {
        historyDetailModal.addEventListener('click', (e) => {
            if (e.target === historyDetailModal) {
                historyDetailModal.style.display = 'none';
            }
        });
    }
    
    // 復元ボタン
    const restoreFromDetail = document.getElementById('restoreFromDetail');
    if (restoreFromDetail) {
        restoreFromDetail.addEventListener('click', restoreFromHistoryDetail);
    }
}

// 履歴を保存
async function saveToHistory(agent, files, prompt, outputPath, outputOption, generatedCommand) {
    const historyItem = createHistoryItem(agent, files, prompt, outputPath, outputOption, generatedCommand);
    
    // 配列の先頭に追加（最新が一番上）
    executionHistory.unshift(historyItem);
    
    // 最大件数を超えた場合は古いものを削除
    if (executionHistory.length > MAX_HISTORY_ITEMS) {
        executionHistory = executionHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Chrome Storage に保存
    try {
        await chrome.storage.local.set({ 'taskAgentsHistory': executionHistory });
        console.log('📝 履歴を保存しました:', historyItem.id);
    } catch (error) {
        console.error('履歴保存エラー:', error);
    }
}

// 履歴を読み込み
async function loadExecutionHistory() {
    try {
        const result = await chrome.storage.local.get(['taskAgentsHistory']);
        if (result.taskAgentsHistory) {
            executionHistory = result.taskAgentsHistory;
            console.log(`📋 ${executionHistory.length}件の履歴を読み込みました`);
        }
    } catch (error) {
        console.error('履歴読み込みエラー:', error);
        executionHistory = [];
    }
}

// 履歴一覧を表示
function loadHistoryList() {
    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    
    if (executionHistory.length === 0) {
        historyList.innerHTML = '';
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    historyList.innerHTML = executionHistory.map(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const truncatedPrompt = item.prompt.length > 100 
            ? item.prompt.substring(0, 100) + '...' 
            : item.prompt;
            
        return `
            <div class="history-item" data-history-id="${item.id}">
                <div class="history-header">
                    <div class="history-agent">🤖 ${item.agent.displayName}</div>
                    <div class="history-date">📅 ${formattedDate}</div>
                </div>
                <div class="history-details">
                    <div class="history-files">📁 ${item.files.length}個のファイル</div>
                    <div class="history-prompt">${truncatedPrompt}</div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-small history-detail-btn" data-history-id="${item.id}">
                        📋 詳細を見る
                    </button>
                    <button class="btn btn-primary btn-small history-restore-btn" data-history-id="${item.id}">
                        🔄 復元
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // イベントリスナーを設定
    setupHistoryItemEventListeners();
}

// 履歴アイテムのイベントリスナー設定
function setupHistoryItemEventListeners() {
    // 詳細ボタン
    document.querySelectorAll('.history-detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const historyId = btn.dataset.historyId;
            showHistoryDetail(historyId);
        });
    });
    
    // 復元ボタン
    document.querySelectorAll('.history-restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const historyId = btn.dataset.historyId;
            restoreFromHistory(historyId);
        });
    });
}

// 履歴詳細を表示
function showHistoryDetail(historyId) {
    const historyItem = executionHistory.find(item => item.id === historyId);
    if (!historyItem) return;
    
    const modal = document.getElementById('historyDetailModal');
    const modalBody = document.getElementById('historyDetailBody');
    
    const date = new Date(historyItem.timestamp);
    const formattedDate = date.toLocaleString('ja-JP');
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h5>🤖 エージェント</h5>
            <p><strong>${historyItem.agent.displayName}</strong></p>
            <p class="text-muted">${historyItem.agent.description}</p>
        </div>
        
        <div class="detail-section">
            <h5>📅 実行日時</h5>
            <p>${formattedDate}</p>
        </div>
        
        <div class="detail-section">
            <h5>📁 入力ファイル (${historyItem.files.length}個)</h5>
            ${historyItem.files.map(file => `
                <div class="file-detail">
                    <div class="file-name">📄 ${file.name}</div>
                    <div class="file-path text-muted">${file.path}</div>
                    <div class="file-size text-muted">${formatFileSize(file.size)}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="detail-section">
            <h5>✏️ プロンプト</h5>
            <pre class="prompt-detail">${historyItem.prompt}</pre>
        </div>
        
        <div class="detail-section">
            <h5>📤 出力先</h5>
            <p>${historyItem.outputPath} (${getOutputOptionLabel(historyItem.outputOption)})</p>
        </div>
        
        <div class="detail-section">
            <h5>⚡ 生成されたコマンド</h5>
            <pre class="command-detail">${historyItem.generatedCommand}</pre>
        </div>
    `;
    
    // 復元ボタンにhistoryIdを設定
    const restoreBtn = document.getElementById('restoreFromDetail');
    restoreBtn.dataset.historyId = historyId;
    
    modal.style.display = 'block';
}

// 履歴から復元
function restoreFromHistory(historyId) {
    const historyItem = executionHistory.find(item => item.id === historyId);
    if (!historyItem) return;
    
    // エージェントタブに切り替え
    const agentTab = document.getElementById('agentTab');
    const historyTab = document.getElementById('historyTab');
    const agentContent = document.getElementById('agentContent');
    const historyContent = document.getElementById('historyContent');
    switchTab('agent', agentTab, historyTab, agentContent, historyContent);
    
    // エージェントを選択
    if (historyItem.agent.name) {
        selectAgent(historyItem.agent.name);
    }
    
    // ファイルを復元
    selectedFiles = historyItem.files.map(file => ({
        name: file.name,
        path: file.path,
        size: file.size,
        restored: true
    }));
    displaySelectedFiles();
    
    // プロンプトを復元
    document.getElementById('promptInput').value = historyItem.prompt;
    
    // 出力設定を復元
    outputOption = historyItem.outputOption;
    outputPath = historyItem.outputPath;
    
    // 出力オプションのラジオボタンを更新
    const outputRadio = document.querySelector(`input[name="outputOption"][value="${outputOption}"]`);
    if (outputRadio) {
        outputRadio.checked = true;
    }
    
    // 手動入力の場合、値を設定
    if (outputOption === 'manual') {
        document.getElementById('manualOutputPath').value = outputPath || '';
    }
    
    updateOutputControls();
    updateSelectedOutputDisplay();
    
    showStatus(`履歴から設定を復元しました: ${historyItem.agent.displayName}`, 'success');
}

// 詳細モーダルから復元
function restoreFromHistoryDetail() {
    const restoreBtn = document.getElementById('restoreFromDetail');
    const historyId = restoreBtn.dataset.historyId;
    
    // モーダルを閉じる
    document.getElementById('historyDetailModal').style.display = 'none';
    
    // 復元実行
    restoreFromHistory(historyId);
}

// 出力オプションのラベルを取得
function getOutputOptionLabel(option) {
    switch(option) {
        case 'folder': return 'フォルダ選択';
        case 'manual': return '手動入力';
        case 'same': return '入力ファイルと同じフォルダ';
        default: return '不明';
    }
}

// ユーティリティ関数
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
}