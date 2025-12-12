#!/usr/bin/env python3
"""
LLMLingua Prompt Compression for OpenMind
Uses Microsoft's LLMLingua to compress prompts for smaller LLMs
"""

import sys
import json
import argparse
import os
from pathlib import Path

# Set model cache directory to local models folder
SCRIPT_DIR = Path(__file__).parent.parent
MODELS_CACHE = SCRIPT_DIR / "models" / "llmlingua"

# Set HuggingFace cache environment variables
os.environ['HF_HOME'] = str(MODELS_CACHE)
os.environ['TRANSFORMERS_CACHE'] = str(MODELS_CACHE)

# Lazy load to avoid slow startup
llm_lingua = None

def get_compressor():
    """Lazy load the LLMLingua compressor"""
    global llm_lingua
    if llm_lingua is None:
        try:
            from llmlingua import PromptCompressor
            # Use a small, fast model for compression
            # Model will be loaded from local cache if available
            llm_lingua = PromptCompressor(
                model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
                use_llmlingua2=True,
                device_map="cpu"  # Use CPU for compatibility
            )
            print(json.dumps({"status": "loaded", "model": "llmlingua-2", "cache": str(MODELS_CACHE)}), file=sys.stderr)
        except ImportError:
            print(json.dumps({"error": "LLMLingua not installed. Run: pip install llmlingua"}), file=sys.stderr)
            return None
        except Exception as e:
            print(json.dumps({"error": f"Failed to load LLMLingua: {str(e)}"}), file=sys.stderr)
            return None
    return llm_lingua

def compress_prompt(text, target_ratio=0.5, force_tokens=None):
    """
    Compress a prompt using LLMLingua
    
    Args:
        text: The text to compress
        target_ratio: Target compression ratio (0.5 = 50% of original)
        force_tokens: List of tokens to keep (e.g., important keywords)
    
    Returns:
        Compressed text
    """
    compressor = get_compressor()
    if compressor is None:
        return text  # Return original if compression fails
    
    try:
        result = compressor.compress_prompt(
            text,
            rate=target_ratio,
            force_tokens=force_tokens or [],
            drop_consecutive=True
        )
        return result.get("compressed_prompt", text)
    except Exception as e:
        print(json.dumps({"error": f"Compression failed: {str(e)}"}), file=sys.stderr)
        return text

def compress_messages(messages, target_ratio=0.6):
    """
    Compress a list of chat messages
    
    Args:
        messages: List of {role, content} message dicts
        target_ratio: Target compression ratio
    
    Returns:
        List of compressed messages
    """
    compressor = get_compressor()
    if compressor is None:
        return messages
    
    compressed = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        
        # Don't compress system prompts or very short messages
        if role == "system" or len(content) < 100:
            compressed.append(msg)
            continue
        
        # Compress longer messages
        try:
            result = compressor.compress_prompt(
                content,
                rate=target_ratio,
                drop_consecutive=True
            )
            compressed_content = result.get("compressed_prompt", content)
            compressed.append({
                "role": role,
                "content": compressed_content
            })
        except:
            compressed.append(msg)
    
    return compressed

def main():
    parser = argparse.ArgumentParser(description="LLMLingua Prompt Compression")
    parser.add_argument("--mode", choices=["text", "messages", "check"], default="text",
                       help="Compression mode")
    parser.add_argument("--ratio", type=float, default=0.5,
                       help="Target compression ratio (0.5 = 50%)")
    parser.add_argument("--input", type=str, help="Input text or JSON file")
    
    args = parser.parse_args()
    
    if args.mode == "check":
        # Just check if LLMLingua is available
        compressor = get_compressor()
        if compressor:
            print(json.dumps({"available": True}))
        else:
            print(json.dumps({"available": False}))
        return
    
    # Read input
    if args.input:
        if args.input.endswith(".json"):
            with open(args.input, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = args.input
    else:
        # Read from stdin
        data = sys.stdin.read()
        try:
            data = json.loads(data)
        except:
            pass  # Keep as string
    
    # Compress
    if args.mode == "messages" and isinstance(data, list):
        result = compress_messages(data, args.ratio)
    else:
        if isinstance(data, str):
            result = compress_prompt(data, args.ratio)
        else:
            result = data
    
    # Output
    print(json.dumps({"result": result}))

if __name__ == "__main__":
    main()
