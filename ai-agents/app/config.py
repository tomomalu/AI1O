"""
AI1O Agent Web App Configuration
フォルダ名やパスを柔軟に設定できる設定ファイル
"""
import os

# デフォルト設定
DEFAULT_CONFIG = {
    # フォルダ名設定
    'APP_FOLDER_NAME': 'app',
    'AGENTS_FOLDER': '../agents',
    'UPLOAD_FOLDER': 'uploads',
    'OUTPUT_FOLDER': 'output',
    
    # サーバー設定
    'HOST': '127.0.0.1',
    'PORT': 5001,
    'DEBUG': True,
    
    # アプリ設定
    'MAX_UPLOAD_SIZE': 16 * 1024 * 1024,  # 16MB
    'ALLOWED_EXTENSIONS': ['.txt', '.md', '.pdf', '.docx', '.json', '.csv']
}

def get_config():
    """環境変数を考慮した設定を取得"""
    config = DEFAULT_CONFIG.copy()
    
    # 環境変数があれば上書き
    for key in config:
        env_value = os.environ.get(key)
        if env_value:
            if key in ['PORT', 'MAX_UPLOAD_SIZE']:
                config[key] = int(env_value)
            elif key in ['DEBUG']:
                config[key] = env_value.lower() in ['true', '1', 'yes']
            elif key == 'ALLOWED_EXTENSIONS':
                config[key] = env_value.split(',')
            else:
                config[key] = env_value
    
    return config

# 現在の設定を取得
CONFIG = get_config()

# よく使う設定を個別に取得
AGENTS_FOLDER = CONFIG['AGENTS_FOLDER']
APP_FOLDER_NAME = CONFIG['APP_FOLDER_NAME']
UPLOAD_FOLDER = CONFIG['UPLOAD_FOLDER']
OUTPUT_FOLDER = CONFIG['OUTPUT_FOLDER']
HOST = CONFIG['HOST']
PORT = CONFIG['PORT']
DEBUG = CONFIG['DEBUG']