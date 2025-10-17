#!/usr/bin/env python3
import spacy
import click
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any, Union
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor, as_completed
import os
import json


class TextMasker:
    def __init__(self):
        # GiNZAモデルをロード
        try:
            import ja_ginza
            self.nlp = spacy.load("ja_ginza")
        except (ImportError, OSError):
            try:
                # 代替モデル名を試す
                self.nlp = spacy.load("ja_core_news_sm")
            except OSError:
                click.echo("GiNZAモデルがインストールされていません。")
                click.echo("以下のコマンドで依存関係をインストールしてください:")
                click.echo("pip install ginza ja-ginza")
                raise
        
        # spaCyのNERラベルをPresidioのエンティティタイプにマッピング
        self.entity_mapping = {
            "Person": "PERSON",
            "PERSON": "PERSON",
            "Company": "ORGANIZATION",
            "Corporation": "ORGANIZATION", 
            "Organization": "ORGANIZATION",
            "ORG": "ORGANIZATION"
        }
        
        # チャンクサイズを設定（バイト数）
        self.max_chunk_size = 40000  # 40KB（安全マージンを持たせる）
        
    def split_text_into_chunks(self, text: str) -> List[tuple[str, int]]:
        """テキストを適切なサイズのチャンクに分割"""
        chunks = []
        
        # 改行で分割してから処理
        lines = text.split('\n')
        current_chunk = []
        current_size = 0
        current_offset = 0
        
        for line in lines:
            line_size = len(line.encode('utf-8'))
            
            # 現在のチャンクに追加してもサイズを超えない場合
            if current_size + line_size + 1 <= self.max_chunk_size:  # +1 for newline
                current_chunk.append(line)
                current_size += line_size + 1
            else:
                # 現在のチャンクを保存
                if current_chunk:
                    chunk_text = '\n'.join(current_chunk)
                    chunks.append((chunk_text, current_offset))
                    current_offset += len(chunk_text) + 1
                
                # 新しいチャンクを開始
                current_chunk = [line]
                current_size = line_size + 1
        
        # 最後のチャンクを保存
        if current_chunk:
            chunk_text = '\n'.join(current_chunk)
            chunks.append((chunk_text, current_offset))
        
        return chunks
        
    def analyze_japanese_text(self, text: str, offset: int = 0) -> List[dict]:
        """日本語テキストを分析してエンティティを抽出"""
        doc = self.nlp(text)
        results = []
        
        for ent in doc.ents:
            if ent.label_ in self.entity_mapping:
                results.append({
                    "entity_type": self.entity_mapping[ent.label_],
                    "start": ent.start_char + offset,
                    "end": ent.end_char + offset,
                    "score": 0.85
                })
                
        return results
        
    def mask_text(self, text: str) -> str:
        """テキスト内の個人名と会社名をマスキング"""
        # テキストが短い場合は直接処理
        text_size = len(text.encode('utf-8'))
        if text_size <= self.max_chunk_size:
            results = self.analyze_japanese_text(text)
        else:
            # 大きなテキストはチャンクに分割して処理
            chunks = self.split_text_into_chunks(text)
            results = []
            
            for chunk_text, offset in chunks:
                chunk_results = self.analyze_japanese_text(chunk_text, offset)
                results.extend(chunk_results)
        
        if not results:
            return text
            
        # resultsを開始位置でソート（降順）
        results.sort(key=lambda x: x["start"], reverse=True)
        
        # テキストを置換
        masked_text = text
        for result in results:
            if result["entity_type"] == "PERSON":
                replacement = "[個人名]"
            elif result["entity_type"] == "ORGANIZATION":
                replacement = "[会社名]"
            else:
                continue
                
            masked_text = (
                masked_text[:result["start"]] + 
                replacement + 
                masked_text[result["end"]:]
            )
        
        return masked_text
    
    def mask_filename(self, filename: str) -> str:
        """ファイル名内の個人名と会社名をマスキング"""
        # ファイル名（拡張子を除く）を処理
        name_parts = filename.rsplit('.', 1)
        if len(name_parts) == 2:
            name, ext = name_parts
            masked_name = self.mask_text(name)
            return f"{masked_name}.{ext}"
        else:
            # 拡張子がない場合
            return self.mask_text(filename)
    
    def mask_json_value(self, value: Union[str, Dict, List, Any]) -> Union[str, Dict, List, Any]:
        """JSON値を再帰的にマスキング"""
        if isinstance(value, str):
            # 文字列の場合はマスキング
            return self.mask_text(value)
        elif isinstance(value, dict):
            # 辞書の場合は各値を再帰的に処理
            return {k: self.mask_json_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            # リストの場合は各要素を再帰的に処理
            return [self.mask_json_value(item) for item in value]
        else:
            # その他の値（数値、bool、null等）はそのまま返す
            return value
    
    def mask_json(self, json_content: str) -> str:
        """JSON形式のテキストをマスキング"""
        # JSONをパース
        data = json.loads(json_content)
        
        # 再帰的にマスキング
        masked_data = self.mask_json_value(data)
        
        # JSON形式に戻す
        return json.dumps(masked_data, ensure_ascii=False, indent=2)


# グローバル変数（プロセス間で共有）
_masker: Optional[TextMasker] = None


def init_worker():
    """ワーカープロセスの初期化関数"""
    global _masker
    _masker = TextMasker()


def process_file_worker(args: Tuple[Path, Path, Path, bool, bool]) -> Tuple[bool, Optional[Path], str]:
    """
    並列処理用のワーカー関数
    
    Args:
        args: (input_path, output_path, input_base_path, keep_filename, keep_original) のタプル
        
    Returns:
        (成功フラグ, マスキング後のパス, メッセージ) のタプル
    """
    input_path, output_path, input_base_path, keep_filename, keep_original = args
    relative_path = input_path.relative_to(input_base_path)
    
    try:
        result, masked_output_path = process_file(_masker, input_path, output_path, keep_filename)
        
        if result and masked_output_path:
            # 処理成功後、keep_originalがFalseの場合のみ元のファイルを削除
            if not keep_original:
                input_path.unlink()
            masked_relative_path = masked_output_path.relative_to(output_path.parent)
            
            if masked_relative_path != relative_path:
                message = f"✓ マスキング完了: {relative_path} → {masked_relative_path}"
            else:
                message = f"✓ マスキング完了: {relative_path}"
            
            return True, masked_output_path, message
        else:
            return False, None, f"✗ マスキング失敗: {relative_path}"
            
    except Exception as e:
        return False, None, f"✗ エラー: {relative_path} - {str(e)}"


def process_file(masker: TextMasker, input_path: Path, output_path: Path, keep_filename: bool = False):
    """ファイルを処理してマスキングを実行"""
    try:
        # ファイルサイズをチェック
        file_size = input_path.stat().st_size
        if file_size > 10 * 1024 * 1024:  # 10MB以上
            click.echo(f"  大きなファイル ({file_size // 1024 // 1024}MB) を処理中...")
        
        # ファイルを読み込み
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # ファイル拡張子に基づいてマスキング方法を選択
        if input_path.suffix.lower() in ['.json', '.jsonl']:
            # JSON形式として処理
            masked_content = masker.mask_json(content)
        else:
            # 通常のテキストとして処理
            masked_content = masker.mask_text(content)
        
        # keep_filenameがFalseの場合のみファイル名をマスキング
        if not keep_filename:
            original_filename = output_path.name
            masked_filename = masker.mask_filename(original_filename)
            if masked_filename != original_filename:
                output_path = output_path.parent / masked_filename
        
        # 出力ディレクトリを作成
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # マスキング済みファイルを保存
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(masked_content)
            
        return True, output_path
        
    except Exception as e:
        click.echo(f"エラー: {input_path} の処理中にエラーが発生しました: {str(e)}", err=True)
        return False, None


@click.command()
@click.option('--input-dir', '-i', default='before', 
              help='マスキング前のファイルがあるディレクトリ')
@click.option('--output-dir', '-o', default='after',
              help='マスキング後のファイルを保存するディレクトリ')
@click.option('--extensions', '-e', multiple=True, default=['.txt'],
              help='処理対象のファイル拡張子（複数指定可）')
@click.option('--workers', '-w', default=None, type=int,
              help='並列処理のワーカー数（デフォルト: CPUコア数）')
@click.option('--keep-filename', '-k', is_flag=True,
              help='ファイル名をマスキングしない')
@click.option('--keep-original', '-K', is_flag=True, default=True,
              help='元ファイルを削除しない')
def main(input_dir: str, output_dir: str, extensions: tuple, workers: Optional[int], keep_filename: bool, keep_original: bool):
    """テキストファイル内の会社名と個人名をマスキングするCLIツール"""
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    # 入力ディレクトリの存在確認
    if not input_path.exists():
        click.echo(f"エラー: 入力ディレクトリ '{input_dir}' が存在しません。", err=True)
        return
        
    # 出力ディレクトリを作成
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 処理対象のファイルを収集
    files_to_process = []
    for ext in extensions:
        files_to_process.extend(input_path.glob(f'**/*{ext}'))
    
    if not files_to_process:
        click.echo(f"警告: '{input_dir}' に処理対象のファイルが見つかりません。")
        return
    
    # ワーカー数を設定（デフォルトはCPUコア数）
    if workers is None:
        workers = mp.cpu_count()
    
    click.echo(f"{len(files_to_process)}個のファイルを{workers}個のワーカーで並列処理します...")
    
    # タスクリストを準備（各ファイルの処理に必要な引数をタプルで作成）
    tasks = []
    for file_path in files_to_process:
        relative_path = file_path.relative_to(input_path)
        output_file_path = output_path / relative_path
        tasks.append((file_path, output_file_path, input_path, keep_filename, keep_original))
    
    # 並列処理を実行
    processed_count = 0
    failed_count = 0
    
    # プロセスプールを作成して並列処理
    with ProcessPoolExecutor(max_workers=workers, initializer=init_worker) as executor:
        # すべてのタスクを投入
        future_to_file = {executor.submit(process_file_worker, task): task[0] for task in tasks}
        
        # 完了したタスクから順に結果を処理
        for future in as_completed(future_to_file):
            file_path = future_to_file[future]
            try:
                success, masked_path, message = future.result()
                click.echo(f"  {message}")
                
                if success:
                    processed_count += 1
                else:
                    failed_count += 1
                    
            except Exception as exc:
                failed_count += 1
                relative_path = file_path.relative_to(input_path)
                click.echo(f"  ✗ 予期しないエラー: {relative_path} - {exc}")
    
    # 結果サマリーを表示
    click.echo(f"\n処理完了: {processed_count}/{len(files_to_process)} ファイル")
    if failed_count > 0:
        click.echo(f"失敗: {failed_count} ファイル")


if __name__ == '__main__':
    main()