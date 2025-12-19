"""
Piper TTS REST API Server
Simple HTTP API for text-to-speech synthesis
"""
import os
import io
import wave
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from piper import PiperVoice

app = Flask(__name__)
CORS(app)

# Load voice model
VOICE_PATH = os.environ.get('PIPER_VOICE', '/app/voices/en_US-amy-medium.onnx')
voice = None

def get_voice():
    global voice
    if voice is None:
        print(f"Loading voice model: {VOICE_PATH}")
        voice = PiperVoice.load(VOICE_PATH)
        print("Voice model loaded!")
    return voice

@app.route('/')
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "piper-tts"})

@app.route('/api/tts', methods=['GET', 'POST'])
def synthesize():
    """
    Synthesize speech from text
    GET: /api/tts?text=Hello%20world
    POST: /api/tts with JSON body {"text": "Hello world"}
    Returns: WAV audio
    """
    # Get text from query param or JSON body
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        text = data.get('text', '')
    else:
        text = request.args.get('text', '')
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        v = get_voice()
        
        # Synthesize to WAV in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(v.config.sample_rate)
            
            # Generate audio
            for audio_bytes in v.synthesize_stream_raw(text):
                wav_file.writeframes(audio_bytes)
        
        wav_buffer.seek(0)
        
        return Response(
            wav_buffer.read(),
            mimetype='audio/wav',
            headers={'Content-Disposition': 'inline; filename="speech.wav"'}
        )
        
    except Exception as e:
        print(f"TTS Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/voices', methods=['GET'])
def list_voices():
    """List available voices"""
    voices_dir = '/app/voices'
    voices = []
    if os.path.exists(voices_dir):
        for f in os.listdir(voices_dir):
            if f.endswith('.onnx'):
                voices.append(f.replace('.onnx', ''))
    return jsonify({"voices": voices})

if __name__ == '__main__':
    # Pre-load voice on startup
    get_voice()
    print("Piper TTS Server starting on port 5002...")
    app.run(host='0.0.0.0', port=5002, threaded=True)
