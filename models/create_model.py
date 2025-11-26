"""
OpenChat Model Creator
Converts Qwen3-4B-Thinking-2507 to GGUF and creates Ollama model with baked-in reasoning rules.

Usage:
    python create_model.py

Requirements:
    pip install llama-cpp-python transformers torch
"""

import os
import subprocess
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "Qwen3-4B-Thinking-2507"
OUTPUT_DIR = Path(__file__).parent
MODELFILE = Path(__file__).parent / "Modelfile"
MODEL_NAME = "openchat-qwen3"

def check_dependencies():
    """Check if required tools are installed."""
    print("Checking dependencies...")
    
    # Check if Ollama is installed
    try:
        result = subprocess.run(["ollama", "--version"], capture_output=True, text=True)
        print(f"✓ Ollama: {result.stdout.strip()}")
    except FileNotFoundError:
        print("✗ Ollama not found. Please install from https://ollama.ai")
        return False
    
    return True

def check_model_files():
    """Check if model files are downloaded."""
    print(f"\nChecking model files in {MODEL_DIR}...")
    
    if not MODEL_DIR.exists():
        print(f"✗ Model directory not found: {MODEL_DIR}")
        return False
    
    # Check for safetensors files
    safetensors = list(MODEL_DIR.glob("*.safetensors"))
    if not safetensors:
        print("✗ No safetensors files found. Download may still be in progress.")
        return False
    
    print(f"✓ Found {len(safetensors)} safetensors files")
    
    # Check for config
    if not (MODEL_DIR / "config.json").exists():
        print("✗ config.json not found")
        return False
    
    print("✓ config.json found")
    return True

def convert_to_gguf():
    """Convert safetensors to GGUF format using llama.cpp."""
    print("\n" + "="*50)
    print("Converting to GGUF format...")
    print("="*50)
    
    gguf_path = OUTPUT_DIR / "openchat-qwen3.gguf"
    
    # Check if already converted
    if gguf_path.exists():
        print(f"✓ GGUF file already exists: {gguf_path}")
        return gguf_path
    
    # Try using llama-cpp-python's convert script
    try:
        # First, try the llama.cpp convert script if available
        convert_script = Path.home() / ".local" / "bin" / "convert-hf-to-gguf.py"
        
        if not convert_script.exists():
            # Try to find it in common locations
            possible_paths = [
                Path("C:/llama.cpp/convert-hf-to-gguf.py"),
                Path.home() / "llama.cpp" / "convert-hf-to-gguf.py",
                Path("/usr/local/bin/convert-hf-to-gguf.py"),
            ]
            for p in possible_paths:
                if p.exists():
                    convert_script = p
                    break
        
        if convert_script.exists():
            print(f"Using convert script: {convert_script}")
            subprocess.run([
                sys.executable, str(convert_script),
                str(MODEL_DIR),
                "--outfile", str(gguf_path),
                "--outtype", "q8_0"  # 8-bit quantization for good quality/size balance
            ], check=True)
            return gguf_path
        
    except Exception as e:
        print(f"Convert script method failed: {e}")
    
    # Alternative: Use Ollama's built-in conversion
    print("\nTrying Ollama's built-in conversion...")
    print("This will create the model directly from safetensors.")
    
    # Update Modelfile to use safetensors directly
    modelfile_content = MODELFILE.read_text()
    modelfile_content = modelfile_content.replace(
        "FROM ./Qwen3-4B-Thinking-2507",
        f"FROM {MODEL_DIR}"
    )
    
    temp_modelfile = OUTPUT_DIR / "Modelfile.temp"
    temp_modelfile.write_text(modelfile_content)
    
    return temp_modelfile

def create_ollama_model(modelfile_path):
    """Create Ollama model from Modelfile."""
    print("\n" + "="*50)
    print(f"Creating Ollama model: {MODEL_NAME}")
    print("="*50)
    
    try:
        # Change to models directory for relative paths
        os.chdir(OUTPUT_DIR)
        
        # Use encoding='utf-8' and errors='replace' to handle Windows encoding issues
        result = subprocess.run(
            ["ollama", "create", MODEL_NAME, "-f", str(modelfile_path)],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            print(f"Model '{MODEL_NAME}' created successfully!")
            print(result.stdout)
            return True
        else:
            print(f"Failed to create model:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"Error creating model: {e}")
        return False

def test_model():
    """Quick test of the created model."""
    print("\n" + "="*50)
    print("Testing model...")
    print("="*50)
    
    try:
        result = subprocess.run(
            ["ollama", "run", MODEL_NAME, "Say hello in one sentence."],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=60
        )
        
        if result.returncode == 0:
            print("Model response:")
            print(result.stdout)
            return True
        else:
            print(f"Test failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("Test timed out")
        return False
    except Exception as e:
        print(f"Test error: {e}")
        return False

def main():
    print("="*50)
    print("OpenChat Model Creator")
    print("="*50)
    
    # Step 1: Check dependencies
    if not check_dependencies():
        print("\nPlease install missing dependencies and try again.")
        return 1
    
    # Step 2: Check model files
    if not check_model_files():
        print("\nPlease wait for model download to complete.")
        return 1
    
    # Step 3: Convert/prepare model
    modelfile = convert_to_gguf()
    if not modelfile:
        print("\nFailed to prepare model.")
        return 1
    
    # Step 4: Create Ollama model
    if not create_ollama_model(modelfile):
        print("\nFailed to create Ollama model.")
        return 1
    
    # Step 5: Test
    test_model()
    
    print("\n" + "="*50)
    print("DONE!")
    print("="*50)
    print(f"\nYou can now use the model in OpenChat:")
    print(f"  - Select '{MODEL_NAME}' from the model dropdown")
    print(f"  - Or run: ollama run {MODEL_NAME}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
