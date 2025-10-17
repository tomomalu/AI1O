#!/usr/bin/env python3
"""
商談文字起こしテキストデータマスキングツール

beforeフォルダ内のテキストファイルをマスキングしてafterフォルダに移動する。
- ファイル名: タイムスタンプは保持、商談タイトル部分をハッシュ値に変更
- テキスト内容: 発言者名を「[個人名]」に置換
"""

import os
import re
import hashlib
import shutil
from pathlib import Path
from typing import List, Tuple


class MaskingTool:
    def __init__(self, before_dir: str = "before", after_dir: str = "after"):
        self.before_dir = Path(before_dir)
        self.after_dir = Path(after_dir)
        
    def generate_hash_id(self, text: str) -> str:
        """テキストからハッシュ値を生成（最初の8文字を使用）"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    
    def mask_filename(self, filename: str) -> str:
        """
        ファイル名をマスキング
        例: 20250716-1559_ABC株式会社.txt -> 20250716-1559_a1b2c3d4.txt
        """
        pattern = r'^(\d{8}-\d{4})_(.+)\.txt$'
        match = re.match(pattern, filename)
        
        if match:
            timestamp = match.group(1)
            title = match.group(2)
            hash_id = self.generate_hash_id(title)
            return f"{timestamp}_{hash_id}.txt"
        
        # パターンにマッチしない場合はそのまま返す
        return filename
    
    def mask_speaker_names(self, content: str) -> str:
        """
        テキスト内容の発言者名をマスキング
        例: 00:46 山田 太郎 -> 00:46 [個人名]
        """
        # 経過時間のパターン（HH:MM または MM:SS）
        time_pattern = r'(\d{2}:\d{2})\s+(.+?)(?=\n|$)'
        
        def replace_speaker(match):
            time_part = match.group(1)
            speaker_part = match.group(2).strip()
            return f"{time_part} [個人名]"
        
        # 行ごとに処理
        lines = content.split('\n')
        masked_lines = []
        
        for line in lines:
            # 時間パターンがある行のみ処理
            if re.match(r'^\d{2}:\d{2}\s+', line):
                # 時間部分と発言者名部分を分離
                time_match = re.match(r'^(\d{2}:\d{2})\s+(.*)$', line)
                if time_match:
                    time_part = time_match.group(1)
                    masked_lines.append(f"{time_part} [個人名]")
                else:
                    masked_lines.append(line)
            else:
                masked_lines.append(line)
        
        return '\n'.join(masked_lines)
    
    def process_file(self, file_path: Path) -> None:
        """単一ファイルを処理"""
        try:
            # ファイル内容を読み取り
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # テキスト内容をマスキング
            masked_content = self.mask_speaker_names(content)
            
            # 相対パスを計算
            relative_path = file_path.relative_to(self.before_dir)
            
            # ファイル名をマスキング
            masked_filename = self.mask_filename(file_path.name)
            
            # 出力パスを構築
            output_dir = self.after_dir / relative_path.parent
            output_path = output_dir / masked_filename
            
            # 出力ディレクトリを作成
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # マスキング済みファイルを書き込み
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(masked_content)
            
            # 元ファイルを削除（移動完了）
            file_path.unlink()
            
            print(f"移動完了: {file_path} -> {output_path}")
            
        except Exception as e:
            print(f"エラー: {file_path} の処理に失敗しました - {e}")
    
    def find_text_files(self) -> List[Path]:
        """beforeディレクトリ内の全テキストファイルを再帰的に検索"""
        if not self.before_dir.exists():
            print(f"警告: {self.before_dir} ディレクトリが存在しません")
            return []
        
        text_files = []
        for txt_file in self.before_dir.rglob("*.txt"):
            text_files.append(txt_file)
        
        return text_files
    
    def process_all(self) -> None:
        """全てのテキストファイルを処理"""
        print("商談文字起こしマスキングツールを開始します...")
        
        # afterディレクトリをクリーンアップ
        if self.after_dir.exists():
            shutil.rmtree(self.after_dir)
        self.after_dir.mkdir(parents=True, exist_ok=True)
        
        # テキストファイルを検索
        text_files = self.find_text_files()
        
        if not text_files:
            print("処理対象のテキストファイルが見つかりませんでした")
            return
        
        print(f"処理対象ファイル数: {len(text_files)}")
        
        # 各ファイルを処理
        for file_path in text_files:
            self.process_file(file_path)
        
        print("マスキング処理が完了しました")


def main():
    """メイン関数"""
    tool = MaskingTool()
    tool.process_all()


if __name__ == "__main__":
    main()