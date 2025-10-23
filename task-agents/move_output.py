#!/usr/bin/env python3
"""
app/output フォルダの内容を ../output に移動するスクリプト
"""
import os
import shutil

def move_output():
    source_dir = "app/output"
    target_dir = "output"
    
    print(f"Moving contents from {source_dir} to {target_dir}")
    
    # ターゲットディレクトリが存在しない場合は作成
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        print(f"Created {target_dir}")
    
    # ソースディレクトリが存在する場合のみ処理
    if os.path.exists(source_dir):
        # フォルダ内のすべてのファイル・フォルダを移動
        for item in os.listdir(source_dir):
            source_path = os.path.join(source_dir, item)
            target_path = os.path.join(target_dir, item)
            
            print(f"Moving: {source_path} -> {target_path}")
            
            if os.path.exists(target_path):
                if os.path.isdir(target_path):
                    shutil.rmtree(target_path)
                else:
                    os.remove(target_path)
            
            shutil.move(source_path, target_path)
        
        # 空になったソースディレクトリを削除
        os.rmdir(source_dir)
        print(f"Removed empty {source_dir}")
        
    print("✅ Output folder migration completed!")

if __name__ == "__main__":
    move_output()