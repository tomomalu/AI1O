#!/usr/local/bin/node
// Chrome Native Messaging Host (安定版)
// -- stdout には絶対に console.log しないこと！(通信が壊れる)
// -- デバッグは console.error に出す

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function readMessage() {
  // ---- ヘッダー4バイト読む ----
  const header = Buffer.alloc(4);
  let bytesRead = 0;
  while (bytesRead < 4) {
    const n = fs.readSync(0, header, bytesRead, 4 - bytesRead, null);
    if (n === 0) process.exit(0); // EOF
    bytesRead += n;
  }

  const msgLength = header.readUInt32LE(0);
  if (msgLength === 0) return null;

  // ---- メッセージ本体読む ----
  const body = Buffer.alloc(msgLength);
  bytesRead = 0;
  while (bytesRead < msgLength) {
    const n = fs.readSync(0, body, bytesRead, msgLength - bytesRead, null);
    if (n === 0) process.exit(0);
    bytesRead += n;
  }

  // ---- JSONに変換 ----
  try {
    const message = JSON.parse(body.toString("utf8"));
    return message;
  } catch (err) {
    console.error("❌ JSON parse error:", err);
    console.error("Raw bytes:", body.toString("utf8"));
    return null;
  }
}

function sendMessage(msg) {
  try {
    const data = Buffer.from(JSON.stringify(msg), "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(data.length, 0);
    fs.writeSync(1, header);
    fs.writeSync(1, data);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
  }
}

// ファイルパスを検索・解決する
function findFilePath(filename, searchPaths) {
    console.error(`🔍 Searching for file: ${filename}`);
    
    // 指定された検索パスで探す
    for (const searchPath of searchPaths) {
        const fullPath = path.join(searchPath, filename);
        console.error(`📁 Checking: ${fullPath}`);
        
        try {
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    console.error(`✅ Found: ${fullPath}`);
                    return {
                        success: true,
                        path: fullPath,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    };
                }
            }
        } catch (error) {
            console.error(`❌ Error checking ${fullPath}:`, error.message);
        }
    }
    
    // 見つからない場合は、より広範囲で検索
    const commonPaths = [
        '/Users/tomomalu/Desktop',
        '/Users/tomomalu/Downloads',
        '/Users/tomomalu/Documents',
        '/Volumes/SSD-PROJECT/AI1O',
        '/Volumes/SSD-PROJECT/AI1O/task-agents',
        '/Volumes/SSD-PROJECT/AI1O/task-agents/output',
        '/Volumes/SSD-PROJECT/AI1O/AI1O_org',
        '/Volumes/SSD-PROJECT/AI1O/AI1O_org/output',
        '/Volumes/SSD-PROJECT',
        '/Users/tomomalu'
    ];
    
    // まず高速検索（findコマンド）を試す
    for (const basePath of commonPaths) {
        try {
            console.error(`🚀 Fast search in: ${basePath}`);
            const findCommand = `find "${basePath}" -name "${filename}" -type f 2>/dev/null | head -1`;
            const result = execSync(findCommand, { encoding: 'utf8', timeout: 5000 }).trim();
            
            if (result && fs.existsSync(result)) {
                console.error(`⚡ Found with find command: ${result}`);
                return {
                    success: true,
                    path: result,
                    size: fs.statSync(result).size,
                    modified: fs.statSync(result).mtime.toISOString()
                };
            }
        } catch (error) {
            console.error(`❌ Find command failed for ${basePath}: ${error.message}`);
        }
    }
    
    // findコマンドで見つからない場合は、従来の再帰検索
    console.error(`🔄 Fallback to recursive search`);
    for (const basePath of commonPaths) {
        try {
            const result = searchRecursive(basePath, filename, 15); // 15階層まで
            if (result) {
                console.error(`🎯 Found recursively: ${result}`);
                return {
                    success: true,
                    path: result,
                    size: fs.statSync(result).size,
                    modified: fs.statSync(result).mtime.toISOString()
                };
            }
        } catch (error) {
            // 権限エラーなどは無視
        }
    }
    
    console.error(`❌ File not found: ${filename}`);
    return {
        success: false,
        error: `File "${filename}" not found in search paths`,
        searchedPaths: searchPaths
    };
}

// 再帰的にファイルを検索（深度制限付き）
function searchRecursive(dir, filename, maxDepth) {
    if (maxDepth <= 0) return null;
    
    try {
        const items = fs.readdirSync(dir);
        
        // まず直接マッチするファイルを探す
        for (const item of items) {
            if (item === filename) {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                if (stats.isFile()) {
                    return fullPath;
                }
            }
        }
        
        // 次にサブディレクトリを探す
        for (const item of items) {
            const fullPath = path.join(dir, item);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory() && !item.startsWith('.')) {
                    const result = searchRecursive(fullPath, filename, maxDepth - 1);
                    if (result) return result;
                }
            } catch (error) {
                // 権限エラーなどは無視
            }
        }
    } catch (error) {
        // ディレクトリ読み取りエラーは無視
    }
    
    return null;
}

// フォルダパスを検索・解決する
function findFolderPath(foldername) {
    console.error(`🔍 Searching for folder: ${foldername}`);
    
    const commonPaths = [
        '/Users/tomomalu/Desktop',
        '/Users/tomomalu/Downloads',
        '/Users/tomomalu/Documents',
        '/Volumes/SSD-PROJECT/AI1O',
        '/Volumes/SSD-PROJECT/AI1O/task-agents',
        '/Volumes/SSD-PROJECT/AI1O/task-agents/output',
        '/Volumes/SSD-PROJECT/AI1O/AI1O_org',
        '/Volumes/SSD-PROJECT/AI1O/AI1O_org/output',
        '/Volumes/SSD-PROJECT',
        '/Users/tomomalu'
    ];
    
    // まず高速検索（findコマンド）を試す
    for (const basePath of commonPaths) {
        try {
            console.error(`🚀 Fast folder search in: ${basePath}`);
            const findCommand = `find "${basePath}" -name "${foldername}" -type d 2>/dev/null | head -1`;
            const result = execSync(findCommand, { encoding: 'utf8', timeout: 5000 }).trim();
            
            if (result && fs.existsSync(result)) {
                console.error(`⚡ Found folder with find command: ${result}`);
                return {
                    success: true,
                    path: result,
                    type: 'folder'
                };
            }
        } catch (error) {
            console.error(`❌ Find command failed for ${basePath}: ${error.message}`);
        }
    }
    
    // findコマンドで見つからない場合は、再帰検索
    console.error(`🔄 Fallback to recursive folder search`);
    for (const basePath of commonPaths) {
        try {
            const result = searchRecursiveFolder(basePath, foldername, 10);
            if (result) {
                console.error(`🎯 Found folder recursively: ${result}`);
                return {
                    success: true,
                    path: result,
                    type: 'folder'
                };
            }
        } catch (error) {
            // 権限エラーなどは無視
        }
    }
    
    console.error(`❌ Folder not found: ${foldername}`);
    return {
        success: false,
        error: `Folder "${foldername}" not found`,
        type: 'folder'
    };
}

// 再帰的にフォルダを検索（深度制限付き）
function searchRecursiveFolder(dir, foldername, maxDepth) {
    if (maxDepth <= 0) return null;
    
    try {
        const items = fs.readdirSync(dir);
        
        // まず直接マッチするフォルダを探す
        for (const item of items) {
            if (item === foldername) {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    return fullPath;
                }
            }
        }
        
        // 次にサブディレクトリを探す
        for (const item of items) {
            const fullPath = path.join(dir, item);
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory() && !item.startsWith('.')) {
                    const result = searchRecursiveFolder(fullPath, foldername, maxDepth - 1);
                    if (result) return result;
                }
            } catch (error) {
                // 権限エラーなどは無視
            }
        }
    } catch (error) {
        // ディレクトリ読み取りエラーは無視
    }
    
    return null;
}

// エージェントを検出・読み込みする
function getAgents() {
    console.error('🤖 Scanning for agents...');
    
    const agentsDir = '/Volumes/SSD-PROJECT/AI1O/agents';
    const agents = [];
    
    try {
        if (!fs.existsSync(agentsDir)) {
            console.error(`❌ Agents directory not found: ${agentsDir}`);
            return {
                success: false,
                error: `Agents directory not found: ${agentsDir}`,
                agents: []
            };
        }
        
        const items = fs.readdirSync(agentsDir);
        console.error(`📁 Found ${items.length} items in agents directory`);
        
        for (const item of items) {
            const itemPath = path.join(agentsDir, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // フォルダベースエージェント
                const readmePath = path.join(itemPath, 'README.md');
                if (fs.existsSync(readmePath)) {
                    try {
                        const content = fs.readFileSync(readmePath, 'utf8');
                        agents.push({
                            name: item,
                            displayName: item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            description: `${item} エージェント`,
                            template: content,
                            type: 'folder'
                        });
                        console.error(`✅ Loaded folder agent: ${item}`);
                    } catch (error) {
                        console.error(`❌ Error reading ${readmePath}: ${error.message}`);
                    }
                }
            } else if (item.endsWith('.md')) {
                // ファイルベースエージェント
                try {
                    const content = fs.readFileSync(itemPath, 'utf8');
                    const agentName = item.replace('.md', '');
                    agents.push({
                        name: agentName,
                        displayName: agentName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        description: `${agentName} エージェント`,
                        template: content,
                        type: 'file'
                    });
                    console.error(`✅ Loaded file agent: ${agentName}`);
                } catch (error) {
                    console.error(`❌ Error reading ${itemPath}: ${error.message}`);
                }
            }
        }
        
        console.error(`🎯 Successfully loaded ${agents.length} agents`);
        return {
            success: true,
            agents: agents,
            count: agents.length
        };
        
    } catch (error) {
        console.error(`💥 Error scanning agents directory: ${error.message}`);
        return {
            success: false,
            error: error.message,
            agents: []
        };
    }
}

// ---- メインループ ----
// 起動ログをファイルにも記録
const logFile = '/tmp/native-host.log';
const startMessage = `✅ Native host started at ${new Date().toISOString()}\nPID: ${process.pid}\nNode: ${process.version}\nCWD: ${process.cwd()}\nArgs: ${JSON.stringify(process.argv)}\n\n`;
fs.appendFileSync(logFile, startMessage);
console.error("✅ Native host started (waiting for messages)");

try {
  while (true) {
    const msg = readMessage();
    if (!msg) continue;

    console.error("📩 受信:", msg);
    fs.appendFileSync(logFile, `📩 Received: ${JSON.stringify(msg)}\n`);

    if (msg.action === 'getFilePath') {
      const result = findFilePath(msg.filename, msg.searchPaths || []);
      fs.appendFileSync(logFile, `📤 Sending: ${JSON.stringify(result)}\n`);
      sendMessage(result);
    } else if (msg.action === 'getFolderPath') {
      const result = findFolderPath(msg.foldername);
      fs.appendFileSync(logFile, `📤 Folder result: ${JSON.stringify(result)}\n`);
      sendMessage(result);
    } else if (msg.action === 'getAgents') {
      const result = getAgents();
      fs.appendFileSync(logFile, `🤖 Agents result: ${JSON.stringify(result)}\n`);
      sendMessage(result);
    } else {
      const errorResponse = {
        success: false,
        error: `Unknown action: ${msg.action}`
      };
      fs.appendFileSync(logFile, `❌ Error: ${JSON.stringify(errorResponse)}\n`);
      sendMessage(errorResponse);
    }
  }
} catch (error) {
  const errorMessage = `💥 Fatal error: ${error.message}\nStack: ${error.stack}\n`;
  console.error(errorMessage);
  fs.appendFileSync(logFile, errorMessage);
  process.exit(1);
}