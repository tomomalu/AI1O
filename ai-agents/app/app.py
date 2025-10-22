from flask import Flask, render_template, request, jsonify, send_file
import os
import json
import subprocess
import threading
import time
from datetime import datetime
from config import CONFIG, AGENTS_FOLDER, APP_FOLDER_NAME, UPLOAD_FOLDER, OUTPUT_FOLDER, HOST, PORT, DEBUG

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER

# グローバル変数でタスクの状態を管理
task_status = {
    'running': False,
    'progress': 0,
    'message': '',
    'result': None,
    'error': None
}

def get_available_agents():
    """利用可能なエージェント一覧を取得"""
    agents_dir = AGENTS_FOLDER
    agents = []
    
    if os.path.exists(agents_dir):
        for file in os.listdir(agents_dir):
            if file.endswith('.md') and not file.startswith('templates'):
                agent_name = file.replace('.md', '')
                # エージェントファイルから説明を抽出
                try:
                    with open(os.path.join(agents_dir, file), 'r', encoding='utf-8') as f:
                        content = f.read()
                        description = ''
                        
                        # YAMLフロントマターから説明を抽出
                        if content.startswith('---'):
                            lines = content.split('\n')
                            for line in lines[1:]:
                                if line.startswith('description:'):
                                    description = line.replace('description:', '').strip()
                                    break
                                elif line.strip() == '---':
                                    break
                        
                        # 説明が見つからない場合、最初の段落を使用
                        if not description:
                            lines = content.split('\n')
                            for line in lines:
                                if line.strip() and not line.startswith('#') and not line.startswith('---'):
                                    description = line.strip()
                                    break
                        
                        # 長すぎる場合は切り詰める
                        if len(description) > 100:
                            description = description[:100] + '...'
                        
                        agents.append({
                            'name': agent_name,
                            'display_name': agent_name.replace('-', ' ').title(),
                            'description': description or 'エージェントの説明を読み込めませんでした'
                        })
                except Exception as e:
                    agents.append({
                        'name': agent_name,
                        'display_name': agent_name.replace('-', ' ').title(),
                        'description': 'エージェントの説明を読み込めませんでした'
                    })
    
    return agents

def generate_claude_code_command(agent_type, prompt, input_files, output_path):
    """Claude Codeで実行するためのコマンドを生成"""
    
    # ファイルパスの処理
    file_paths = []
    if input_files:
        for file in input_files:
            if file.startswith('/'):
                file_paths.append(file)  # 絶対パス
            else:
                file_paths.append(f"../uploads/{file}")  # アップロードファイル
    
    # プロンプトの整形
    formatted_prompt = f"""以下のタスクを実行してください：

{prompt}

""" + (f"""
参考ファイル:
{chr(10).join(['- ' + fp for fp in file_paths])}
""" if file_paths else "") + f"""
出力先: {output_path}

よろしくお願いします。"""
    
    # Claude Codeコマンドの生成
    command_parts = [
        "Task tool:",
        f"subagent_type: {agent_type}",
        "",
        "Prompt:",
        f'"{formatted_prompt}"'
    ]
    
    if file_paths:
        command_parts.extend([
            "",
            "Input files:",
            *[f"- {fp}" for fp in file_paths]
        ])
    
    command_parts.extend([
        "",
        f"Output path: {output_path}",
        "",
        "💡 使い方:",
        "1. 上記の内容をClaude Codeにコピペしてください",
        "2. Task toolを使用してエージェントを実行してください", 
        "3. 実行完了後、結果をこのアプリにアップロードしてください"
    ])
    
    return {
        'command': '\n'.join(command_parts),
        'agent_type': agent_type,
        'output_path': output_path,
        'formatted_prompt': formatted_prompt,
        'input_files': file_paths
    }

@app.route('/')
def index():
    """メインページ"""
    agents = get_available_agents()
    return render_template('index.html', agents=agents)

@app.route('/api/agents')
def api_agents():
    """エージェント一覧API"""
    return jsonify(get_available_agents())

@app.route('/api/upload', methods=['POST'])
def api_upload():
    """ファイルアップロードAPI"""
    try:
        uploaded_files = []
        for file in request.files.getlist('files'):
            if file.filename:
                filename = file.filename
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                uploaded_files.append(filename)
        
        return jsonify({
            'success': True,
            'files': uploaded_files
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/prepare', methods=['POST'])
def api_prepare():
    """Claude Code実行準備API"""
    try:
        data = request.json
        agent_type = data.get('agent')
        prompt = data.get('prompt', '')
        input_files = data.get('input_files', [])
        output_path = data.get('output_path', app.config['OUTPUT_FOLDER'])
        
        if not agent_type:
            return jsonify({
                'success': False,
                'error': 'エージェントを選択してください'
            }), 400
            
        if not prompt.strip():
            return jsonify({
                'success': False,
                'error': 'プロンプトを入力してください'
            }), 400
        
        # Claude Codeコマンドを生成
        command_data = generate_claude_code_command(agent_type, prompt, input_files, output_path)
        
        return jsonify({
            'success': True,
            'command_data': command_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload_result', methods=['POST'])
def api_upload_result():
    """実行結果アップロードAPI"""
    try:
        uploaded_files = []
        output_folder = app.config['OUTPUT_FOLDER']
        
        # 結果ファイルを保存
        for file in request.files.getlist('result_files'):
            if file.filename:
                # タイムスタンプ付きフォルダを作成
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                result_dir = os.path.join(output_folder, f'claude_code_result_{timestamp}')
                os.makedirs(result_dir, exist_ok=True)
                
                filename = file.filename
                filepath = os.path.join(result_dir, filename)
                file.save(filepath)
                uploaded_files.append({
                    'filename': filename,
                    'path': filepath,
                    'size': os.path.getsize(filepath)
                })
        
        return jsonify({
            'success': True,
            'uploaded_files': uploaded_files,
            'result_folder': result_dir if uploaded_files else None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/status')
def api_status():
    """タスク状態取得API"""
    return jsonify(task_status)

@app.route('/api/reset')
def api_reset():
    """タスク状態リセットAPI"""
    global task_status
    task_status = {
        'running': False,
        'progress': 0,
        'message': '',
        'result': None,
        'error': None
    }
    return jsonify({'success': True})

@app.route('/api/test_claude_code')
def test_claude_code():
    """Claude Codeコマンドライン availability test"""
    try:
        print("🧪 Testing Claude Code command line availability...")
        
        # Claude Codeが利用可能か確認
        result = subprocess.run(['claude', '--help'], 
                              capture_output=True, text=True, timeout=10)
        
        response_data = {
            'available': result.returncode == 0,
            'return_code': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'test_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        print(f"✅ Claude Code test result: {response_data['available']}")
        
        return jsonify(response_data)
        
    except FileNotFoundError as e:
        print(f"❌ Claude Code not found: {e}")
        return jsonify({
            'available': False,
            'error': 'claude command not found',
            'details': str(e),
            'suggestion': 'Claude Code might not be installed or not in PATH'
        })
    except subprocess.TimeoutExpired:
        print("⏰ Claude Code test timeout")
        return jsonify({
            'available': False,
            'error': 'Command timeout (>10s)',
            'suggestion': 'Claude Code might be unresponsive'
        })
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return jsonify({
            'available': False,
            'error': f'Unexpected error: {str(e)}',
            'type': type(e).__name__
        })

@app.route('/api/claude_code_version')
def claude_code_version():
    """Claude Code version and config info"""
    try:
        # Version check
        version_result = subprocess.run(['claude', '--version'], 
                                      capture_output=True, text=True, timeout=5)
        
        # Config check (if available)
        config_result = None
        try:
            config_result = subprocess.run(['claude', 'config', 'list'], 
                                         capture_output=True, text=True, timeout=5)
        except:
            pass
        
        return jsonify({
            'version': {
                'success': version_result.returncode == 0,
                'output': version_result.stdout,
                'error': version_result.stderr
            },
            'config': {
                'success': config_result.returncode == 0 if config_result else False,
                'output': config_result.stdout if config_result else None,
                'error': config_result.stderr if config_result else None
            } if config_result else None
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'type': type(e).__name__
        })

if __name__ == '__main__':
    # 現在のディレクトリを確認
    current_dir = os.getcwd()
    print(f"🔍 Current working directory: {current_dir}")
    
    # appディレクトリに移動（もし必要であれば）
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(current_dir) != APP_FOLDER_NAME:
        print(f"📁 Changing to script directory: {script_dir}")
        os.chdir(script_dir)
    
    # 必要なディレクトリを作成
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
    
    # agentsフォルダの存在確認
    agents_dir = AGENTS_FOLDER
    print(f"🔍 Checking agents directory: {os.path.abspath(agents_dir)}")
    if os.path.exists(agents_dir):
        agent_files = [f for f in os.listdir(agents_dir) if f.endswith('.md')]
        print(f"✅ Found {len(agent_files)} agent files: {agent_files}")
    else:
        print(f"❌ Agents directory not found: {os.path.abspath(agents_dir)}")
    
    print("🚀 AI1O Agent Web App starting...")
    print(f"📍 URL: http://{HOST}:{PORT}")
    print("📁 Upload folder:", app.config['UPLOAD_FOLDER'])
    print("📁 Output folder:", app.config['OUTPUT_FOLDER'])
    
    app.run(debug=DEBUG, host=HOST, port=PORT)