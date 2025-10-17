#!/usr/bin/env python3
"""GiNZAのインストールヘルパースクリプト"""
import subprocess
import sys

def install_ginza():
    """GiNZAとその依存関係をインストール"""
    packages = [
        "ginza",
        "ja-ginza",
        "ja-ginza-electra"  # 最新のGiNZAモデル
    ]
    
    print("GiNZAをインストールしています...")
    for package in packages:
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    print("\nインストール完了！")
    print("mask_text.pyを実行できます。")

if __name__ == "__main__":
    try:
        install_ginza()
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)