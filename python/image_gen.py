#!/usr/bin/env python3
"""
Local Image Generation using Hugging Face Diffusers or stable-diffusion.cpp
Supports: Diffusers models, GGUF models, single safetensors files
Communicates with Electron via stdin/stdout JSON
"""

import sys
import json
import os
import base64
from io import BytesIO

# Disable progress bars for cleaner output
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

def send_response(data):
    """Send JSON response to stdout"""
    print(json.dumps(data), flush=True)

def send_progress(message, progress=None):
    """Send progress update"""
    data = {"type": "progress", "message": message}
    if progress is not None:
        data["progress"] = progress
    send_response(data)

# Global model cache
pipeline = None
sd_cpp_model = None  # For GGUF models
current_model = None
model_type = None  # 'diffusers' or 'gguf'

def is_gguf_model(path):
    """Check if path points to a GGUF model"""
    if not path:
        return False
    if path.endswith('.gguf'):
        return True
    # Check if directory contains GGUF files
    if os.path.isdir(path):
        for f in os.listdir(path):
            if f.endswith('.gguf'):
                return True
    return False

def is_single_file_model(path):
    """Check if path is a single checkpoint file (.safetensors, .ckpt)"""
    if not path or not os.path.isfile(path):
        return False
    ext = os.path.splitext(path)[1].lower()
    return ext in ['.safetensors', '.ckpt', '.pt', '.pth']

def is_diffusers_model(path):
    """Check if path is a Diffusers model directory"""
    if not path or not os.path.isdir(path):
        return False
    # Check for model_index.json (main indicator)
    if os.path.exists(os.path.join(path, 'model_index.json')):
        return True
    # Check for typical diffusers subdirectories
    subdirs = ['unet', 'vae', 'text_encoder', 'scheduler', 'tokenizer']
    existing = [d for d in subdirs if os.path.isdir(os.path.join(path, d))]
    return len(existing) >= 2

def find_gguf_file(path):
    """Find the best GGUF file in a directory"""
    if path.endswith('.gguf') and os.path.isfile(path):
        return path
    
    if os.path.isdir(path):
        gguf_files = [f for f in os.listdir(path) if f.endswith('.gguf')]
        if not gguf_files:
            return None
        
        # Prefer Q8_0 > Q5_1 > Q5_0 > Q4_1 > Q4_0 > f16 > f32
        priority = ['Q8_0', 'Q5_1', 'Q5_0', 'Q4_1', 'Q4_0', 'f16', 'f32']
        for p in priority:
            for f in gguf_files:
                if p in f:
                    return os.path.join(path, f)
        # Return first one if no priority match
        return os.path.join(path, gguf_files[0])
    
    return None

def check_cuda_available():
    """Check if CUDA is available for PyTorch"""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            return True, f"{gpu_name} ({vram:.1f}GB VRAM)"
        return False, "No CUDA GPU found"
    except:
        return False, "PyTorch CUDA not available"

def check_sd_cpp_cuda():
    """Check if stable-diffusion-cpp was compiled with CUDA support"""
    try:
        from stable_diffusion_cpp import sd_get_system_info
        info = sd_get_system_info()
        if isinstance(info, bytes):
            info = info.decode('utf-8')
        info_upper = info.upper()
        # Check for CUDA indicators in system info
        has_cuda = any(x in info_upper for x in ['CUDA', 'CUBLAS', 'SD_USE_CUDA', 'NVIDIA', 'GPU'])
        return has_cuda, info.strip()
    except ImportError:
        return False, "stable-diffusion-cpp not installed"
    except Exception as e:
        return False, str(e)

def load_gguf_model(model_path):
    """Load a GGUF model using stable-diffusion-cpp-python"""
    global sd_cpp_model, current_model, model_type, pipeline
    
    try:
        from stable_diffusion_cpp import StableDiffusion
        
        gguf_file = find_gguf_file(model_path)
        if not gguf_file:
            raise Exception(f"No GGUF file found in {model_path}")
        
        send_progress(f"Loading GGUF model: {os.path.basename(gguf_file)}...")
        
        # Check for CUDA in stable-diffusion-cpp (not PyTorch!)
        sd_cpp_cuda, sd_cpp_info = check_sd_cpp_cuda()
        if sd_cpp_cuda:
            send_progress(f"GGUF backend: GPU (CUDA)")
        else:
            send_progress(f"GGUF backend: CPU only (CUDA not compiled)")
        
        # Unload any existing model
        pipeline = None
        sd_cpp_model = None
        
        # Get number of CPU threads
        import multiprocessing
        n_threads = max(1, multiprocessing.cpu_count() - 1)
        
        # Note: stable-diffusion-cpp-python uses CUDA automatically if compiled with CUDA support
        # The n_threads parameter is for CPU fallback
        sd_cpp_model = StableDiffusion(
            model_path=gguf_file,
            wtype="default",  # Auto-detect weight type
            n_threads=n_threads,
            verbose=False  # Reduce console spam
        )
        
        current_model = model_path
        model_type = 'gguf'
        
        if sd_cpp_cuda:
            send_progress(f"GGUF model loaded (GPU accelerated)")
        else:
            send_progress(f"GGUF model loaded on CPU ({n_threads} threads) - this will be slow!")
        return True
        
    except ImportError:
        send_response({
            "type": "error", 
            "error": "stable-diffusion-cpp-python not installed. Install with: pip install stable-diffusion-cpp-python"
        })
        return False
    except Exception as e:
        send_response({"type": "error", "error": f"Failed to load GGUF model: {str(e)}"})
        return False

def load_model(model_id, local_path=None):
    """Load a diffusion model from HuggingFace or local path"""
    global pipeline, sd_cpp_model, current_model, model_type
    
    # Use local path if provided, otherwise use model_id
    model_source = local_path if local_path else model_id
    cache_key = local_path if local_path else model_id
    
    if current_model == cache_key and (pipeline is not None or sd_cpp_model is not None):
        send_progress("Model already loaded")
        return True
    
    # Check if this is a GGUF model
    if local_path and is_gguf_model(local_path):
        return load_gguf_model(local_path)
    
    try:
        send_progress(f"Loading model: {model_id}...")
        
        import torch
        from diffusers import AutoPipelineForText2Image, DiffusionPipeline, StableDiffusionPipeline, StableDiffusionXLPipeline
        
        # Clear any GGUF model
        sd_cpp_model = None
        model_type = 'diffusers'
        
        # Determine device
        if torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
            send_progress("Using CUDA GPU")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float16
            send_progress("Using Apple MPS")
        else:
            device = "cpu"
            dtype = torch.float32
            send_progress("Using CPU (slow)")
        
        loaded = False
        is_single_file = local_path and is_single_file_model(local_path)
        
        # Check if this is a single file model (.safetensors, .ckpt)
        if is_single_file:
            file_ext = os.path.splitext(local_path)[1].lower()
            send_progress(f"Loading single file model: {os.path.basename(local_path)}...")
            
            # Warn about .ckpt files - they often have compatibility issues
            if file_ext == '.ckpt':
                send_progress("Warning: .ckpt files may have compatibility issues. Consider using .safetensors instead.")
            
            # Try to load as single file checkpoint
            try:
                filename_lower = os.path.basename(local_path).lower()
                
                # Detect model type from filename
                is_sdxl = 'xl' in filename_lower or 'sdxl' in filename_lower
                is_sd2 = '768' in filename_lower or 'v2' in filename_lower or '2.1' in filename_lower or '2-1' in filename_lower
                
                if is_sdxl:
                    send_progress("Detected SDXL model...")
                    pipeline = StableDiffusionXLPipeline.from_single_file(
                        local_path,
                        torch_dtype=dtype,
                        use_safetensors=file_ext == '.safetensors'
                    )
                    loaded = True
                    send_progress("Loaded as SDXL model")
                elif is_sd2:
                    # SD 2.x models need special handling
                    send_progress("Detected SD 2.x model (768px)...")
                    from diffusers import EulerDiscreteScheduler
                    
                    pipeline = StableDiffusionPipeline.from_single_file(
                        local_path,
                        torch_dtype=dtype,
                        safety_checker=None,
                        use_safetensors=file_ext == '.safetensors'
                    )
                    # SD 2.x works better with Euler scheduler
                    pipeline.scheduler = EulerDiscreteScheduler.from_config(pipeline.scheduler.config)
                    loaded = True
                    send_progress("Loaded as SD 2.x model (768px)")
                else:
                    # Try SD 1.5 single file
                    send_progress("Loading as SD 1.5 model...")
                    pipeline = StableDiffusionPipeline.from_single_file(
                        local_path,
                        torch_dtype=dtype,
                        safety_checker=None,
                        use_safetensors=file_ext == '.safetensors'
                    )
                    loaded = True
                    send_progress("Loaded as SD 1.5 model")
            except Exception as e:
                error_msg = str(e)
                # If SD 1.5 failed, try SDXL as fallback
                send_progress(f"SD 1.5 load failed, trying SDXL...")
                try:
                    pipeline = StableDiffusionXLPipeline.from_single_file(
                        local_path,
                        torch_dtype=dtype,
                        use_safetensors=file_ext == '.safetensors'
                    )
                    loaded = True
                    send_progress("Loaded as SDXL model (fallback)")
                except Exception as e2:
                    # Provide helpful error message for .ckpt files
                    if file_ext == '.ckpt':
                        raise Exception(
                            f"Cannot load .ckpt file. This format is deprecated. "
                            f"Please download the .safetensors version instead, or use SDXL-Turbo from HuggingFace. "
                            f"Original error: {error_msg[:100]}"
                        )
                    else:
                        send_progress(f"Single file load failed: {error_msg[:80]}")
        
        # For directories or HuggingFace models (NOT single files!)
        if not loaded and not is_single_file:
            if local_path:
                send_progress(f"Loading from local: {local_path}...")
            else:
                send_progress(f"Downloading/loading {model_id}...")
            
            # Try AutoPipeline first (works for most models)
            try:
                pipeline = AutoPipelineForText2Image.from_pretrained(
                    model_source,
                    torch_dtype=dtype,
                    safety_checker=None,
                    requires_safety_checker=False,
                    local_files_only=bool(local_path)
                )
                loaded = True
            except Exception as e:
                send_progress(f"AutoPipeline failed, trying alternatives...")
        
        # Try SDXL Pipeline (only for directories/HF models)
        if not loaded and not is_single_file:
            try:
                pipeline = StableDiffusionXLPipeline.from_pretrained(
                    model_source,
                    torch_dtype=dtype,
                    local_files_only=bool(local_path)
                )
                loaded = True
            except:
                pass
        
        # Try SD Pipeline (only for directories/HF models)
        if not loaded and not is_single_file:
            try:
                pipeline = StableDiffusionPipeline.from_pretrained(
                    model_source,
                    torch_dtype=dtype,
                    safety_checker=None,
                    local_files_only=bool(local_path)
                )
                loaded = True
            except:
                pass
        
        # Try generic DiffusionPipeline (only for directories/HF models)
        if not loaded and not is_single_file:
            try:
                pipeline = DiffusionPipeline.from_pretrained(
                    model_source,
                    torch_dtype=dtype,
                    local_files_only=bool(local_path)
                )
                loaded = True
            except Exception as e:
                raise Exception(f"Could not load model with any pipeline: {str(e)}")
        
        # Final check - if still not loaded, raise error
        if not loaded:
            raise Exception(f"Could not load model. Single file: {is_single_file}, Path: {local_path or model_id}")
        
        pipeline = pipeline.to(device)
        
        # Enable memory optimizations
        if device == "cuda":
            try:
                pipeline.enable_attention_slicing()
            except:
                pass
            try:
                pipeline.enable_vae_slicing()
            except:
                pass
        
        current_model = cache_key
        send_progress("Model loaded successfully!")
        return True
        
    except Exception as e:
        send_response({"type": "error", "error": f"Failed to load model: {str(e)}"})
        return False

def generate_image(prompt, negative_prompt="", width=512, height=512, steps=20, guidance=7.5, seed=None):
    """Generate an image from prompt"""
    global pipeline, sd_cpp_model, model_type
    
    if pipeline is None and sd_cpp_model is None:
        send_response({"type": "error", "error": "No model loaded"})
        return
    
    try:
        send_progress("Generating image...", 0)
        
        # Use GGUF model if loaded
        if model_type == 'gguf' and sd_cpp_model is not None:
            # Generate with stable-diffusion-cpp
            import random
            actual_seed = seed if seed is not None else random.randint(0, 2**32 - 1)
            
            send_progress("Generating with GGUF model...")
            
            # Use generate_image method
            images = sd_cpp_model.generate_image(
                prompt=prompt,
                negative_prompt=negative_prompt or "",
                width=width,
                height=height,
                sample_steps=steps,
                cfg_scale=guidance,
                seed=actual_seed
            )
            
            if images is None:
                raise Exception("No image generated")
            
            # Handle different return types
            if isinstance(images, list):
                image = images[0]
            else:
                image = images
            
        else:
            # Use Diffusers pipeline
            import torch
            
            # Set seed for reproducibility
            generator = None
            if seed is not None:
                generator = torch.Generator(device=pipeline.device).manual_seed(seed)
            
            # Generate
            result = pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt if negative_prompt else None,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator
            )
            
            image = result.images[0]
        
        # Convert to base64
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        send_response({
            "type": "result",
            "success": True,
            "image": {
                "base64": base64_image,
                "dataUrl": f"data:image/png;base64,{base64_image}",
                "width": image.width,
                "height": image.height
            }
        })
        
    except Exception as e:
        send_response({"type": "error", "error": f"Generation failed: {str(e)}"})

def check_dependencies():
    """Check if required packages are installed"""
    missing = []
    optional_missing = []
    
    try:
        import torch
    except ImportError:
        missing.append("torch")
    
    try:
        import diffusers
    except ImportError:
        missing.append("diffusers")
    
    try:
        import transformers
    except ImportError:
        missing.append("transformers")
    
    try:
        import accelerate
    except ImportError:
        missing.append("accelerate")
    
    # Optional: stable-diffusion-cpp for GGUF support
    try:
        import stable_diffusion_cpp
    except ImportError:
        optional_missing.append("stable-diffusion-cpp-python")
    
    return missing, optional_missing

def main():
    """Main loop - read JSON commands from stdin"""
    
    # Check dependencies first
    missing, optional_missing = check_dependencies()
    if missing:
        send_response({
            "type": "error",
            "error": f"Missing dependencies: {', '.join(missing)}",
            "install_cmd": f"pip install {' '.join(missing)}"
        })
        return
    
    # Check CUDA availability
    cuda_available, gpu_info = check_cuda_available()
    
    # Report optional missing (GGUF support)
    gguf_support = len(optional_missing) == 0
    send_response({
        "type": "ready",
        "gguf_support": gguf_support,
        "optional_missing": optional_missing,
        "cuda_available": cuda_available,
        "gpu_info": gpu_info
    })
    
    for line in sys.stdin:
        try:
            cmd = json.loads(line.strip())
            action = cmd.get("action")
            
            if action == "load":
                model_id = cmd.get("model", "stabilityai/sdxl-turbo")
                local_path = cmd.get("local_path")  # Optional local path
                success = load_model(model_id, local_path)
                if success:
                    send_response({"type": "loaded", "model": model_id, "local_path": local_path})
                    
            elif action == "generate":
                generate_image(
                    prompt=cmd.get("prompt", ""),
                    negative_prompt=cmd.get("negative_prompt", ""),
                    width=cmd.get("width", 512),
                    height=cmd.get("height", 512),
                    steps=cmd.get("steps", 20),
                    guidance=cmd.get("guidance", 7.5),
                    seed=cmd.get("seed")
                )
                
            elif action == "unload":
                global pipeline, sd_cpp_model, current_model, model_type
                pipeline = None
                sd_cpp_model = None
                current_model = None
                model_type = None
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except:
                    pass
                send_response({"type": "unloaded"})
                
            elif action == "status":
                cuda_available, gpu_info = check_cuda_available()
                sd_cpp_cuda, sd_cpp_info = check_sd_cpp_cuda()
                send_response({
                    "type": "status",
                    "model_loaded": current_model is not None,
                    "current_model": current_model,
                    "model_type": model_type,
                    "cuda_available": cuda_available,
                    "gpu_info": gpu_info,
                    "sd_cpp_cuda": sd_cpp_cuda,
                    "sd_cpp_info": sd_cpp_info
                })
                
            elif action == "quit":
                break
                
        except json.JSONDecodeError:
            send_response({"type": "error", "error": "Invalid JSON"})
        except Exception as e:
            send_response({"type": "error", "error": str(e)})

if __name__ == "__main__":
    main()