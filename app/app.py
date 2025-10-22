from flask import Flask, render_template, request, jsonify, send_file
import os
import json
import subprocess
import threading
import time
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['OUTPUT_FOLDER'] = 'output'

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
    agents_dir = os.path.join('..', 'agents')
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

def run_claude_agent(agent_type, prompt, input_files, output_path):
    """Claude Codeエージェントを実行する（模擬実装）"""
    global task_status
    
    try:
        task_status['running'] = True
        task_status['progress'] = 0
        task_status['message'] = 'エージェントを初期化しています...'
        
        # 進捗状況を模擬
        for i in range(0, 101, 10):
            if i < 30:
                task_status['message'] = f'ファイルを読み込んでいます... ({i}%)'
            elif i < 60:
                task_status['message'] = f'{agent_type}エージェントが分析中... ({i}%)'
            elif i < 90:
                task_status['message'] = f'結果を生成しています... ({i}%)'
            else:
                task_status['message'] = f'出力ファイルを作成中... ({i}%)'
            
            task_status['progress'] = i
            time.sleep(0.5)  # 実際の処理をシミュレート
        
        # 結果ファイルを作成
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        result_dir = os.path.join(output_path, f'{agent_type}_{timestamp}')
        os.makedirs(result_dir, exist_ok=True)
        
        # サンプル結果ファイルを作成
        result_file = os.path.join(result_dir, 'result.md')
        with open(result_file, 'w', encoding='utf-8') as f:
            f.write(f"""# {agent_type}エージェント実行結果

## 実行時刻
{datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}

## 使用エージェント
{agent_type}

## 入力ファイル
{', '.join(input_files) if input_files else 'なし'}

## プロンプト
{prompt}

## 実行結果
{agent_type}エージェントが正常に実行されました。

※ この出力は模擬実装です。実際のエージェント機能を実装するには、
Claude Code APIとの連携が必要です。

## 生成されたファイル
- result.md (この ファイル)
- analysis.json (分析結果)
- output.txt (処理結果)
""")
        
        # 追加のサンプルファイル
        with open(os.path.join(result_dir, 'analysis.json'), 'w', encoding='utf-8') as f:
            json.dump({
                'agent': agent_type,
                'status': 'completed',
                'processing_time': '30 seconds',
                'input_files_count': len(input_files) if input_files else 0,
                'output_files': ['result.md', 'analysis.json', 'output.txt']
            }, f, ensure_ascii=False, indent=2)
        
        with open(os.path.join(result_dir, 'output.txt'), 'w', encoding='utf-8') as f:
            f.write(f'{agent_type}エージェントによる処理が完了しました。\n詳細な結果については、result.mdをご確認ください。')
        
        task_status['progress'] = 100
        task_status['message'] = '処理が完了しました！'
        task_status['result'] = {
            'output_path': result_dir,
            'files': ['result.md', 'analysis.json', 'output.txt']
        }
        
    except Exception as e:
        task_status['error'] = str(e)
        task_status['message'] = f'エラーが発生しました: {str(e)}'
    finally:
        task_status['running'] = False

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

@app.route('/api/execute', methods=['POST'])
def api_execute():
    """エージェント実行API"""
    try:
        data = request.json
        agent_type = data.get('agent')
        prompt = data.get('prompt', '')
        input_files = data.get('input_files', [])
        output_path = data.get('output_path', app.config['OUTPUT_FOLDER'])
        
        if task_status['running']:
            return jsonify({
                'success': False,
                'error': '既に実行中のタスクがあります'
            }), 400
        
        # 非同期でエージェントを実行
        thread = threading.Thread(
            target=run_claude_agent,
            args=(agent_type, prompt, input_files, output_path)
        )
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'エージェントの実行を開始しました'
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

if __name__ == '__main__':
    # 必要なディレクトリを作成
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
    
    print("🚀 AI1O Agent Web App starting...")
    print("📍 URL: http://localhost:5001")
    print("📁 Upload folder:", app.config['UPLOAD_FOLDER'])
    print("📁 Output folder:", app.config['OUTPUT_FOLDER'])
    
    app.run(debug=True, host='127.0.0.1', port=5001)