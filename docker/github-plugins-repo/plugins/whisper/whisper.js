/**
 * Whisper Voice Input Plugin
 * 
 * Simple voice-to-text plugin for OpenMind
 * Hold the microphone button to record, release to transcribe
 */

(function(OpenMindPlugin) {
  
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let recordingStartTime = null;

  // Get the API endpoint from config
  const getEndpoint = () => {
    return OpenMindPlugin.config?.integration?.endpoint || 'http://localhost:9000';
  };

  // Called when plugin is loaded
  OpenMindPlugin.onInit = function(config) {
    console.log('Whisper Voice Input plugin initialized');
    console.log('Endpoint:', getEndpoint());
  };

  // Called when button is pressed (hold)
  OpenMindPlugin.onButtonDown = async function(buttonId) {
    if (buttonId !== 'voice-input') return;
    
    // Prevent double recording
    if (isRecording) return;
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      // Determine best audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunks = [];
      recordingStartTime = Date.now();
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      isRecording = true;
      
      // Show recording indicator
      OpenMindPlugin.showStatus('🎤 Recording...', 'recording');
      
    } catch (err) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError') {
        OpenMindPlugin.showStatus('Microphone access denied', 'error');
      } else if (err.name === 'NotFoundError') {
        OpenMindPlugin.showStatus('No microphone found', 'error');
      } else {
        OpenMindPlugin.showStatus('Microphone error', 'error');
      }
    }
  };

  // Called when button is released
  OpenMindPlugin.onButtonUp = async function(buttonId) {
    if (buttonId !== 'voice-input' || !isRecording) return;
    
    isRecording = false;
    
    // Check minimum recording duration (500ms)
    const recordingDuration = Date.now() - recordingStartTime;
    if (recordingDuration < 500) {
      OpenMindPlugin.showStatus('Hold longer to record', 'warning');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorder.stop();
      }
      return;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Check if we have audio data
        if (audioChunks.length === 0) {
          OpenMindPlugin.showStatus('No audio recorded', 'warning');
          return;
        }
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        
        // Check blob size
        if (audioBlob.size < 1000) {
          OpenMindPlugin.showStatus('Recording too short', 'warning');
          return;
        }
        
        // Show transcribing status
        OpenMindPlugin.showStatus('⏳ Transcribing...', 'processing');
        
        try {
          // Send to Whisper API
          const formData = new FormData();
          
          // Determine file extension based on mime type
          const ext = mediaRecorder.mimeType.includes('webm') ? 'webm' : 'mp4';
          formData.append('audio_file', audioBlob, `recording.${ext}`);
          
          const endpoint = getEndpoint();
          const response = await fetch(`${endpoint}/asr?output=json`, {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            // Handle different response formats
            const text = result.text || result.transcription || result.transcript || '';
            
            if (text.trim()) {
              // Insert transcribed text into chat input
              OpenMindPlugin.setInputText(text.trim());
              OpenMindPlugin.showStatus('✓ Done', 'success');
              // Clear success message after 1.5s
              setTimeout(() => OpenMindPlugin.showStatus('', 'idle'), 1500);
            } else {
              OpenMindPlugin.showStatus('No speech detected', 'warning');
            }
          } else {
            const errorText = await response.text();
            console.error('Whisper API error:', response.status, errorText);
            OpenMindPlugin.showStatus('Transcription failed', 'error');
          }
        } catch (err) {
          console.error('Whisper connection error:', err);
          OpenMindPlugin.showStatus('Connection error - is Whisper running?', 'error');
        }
      };
    }
  };

})(window.OpenMindPlugin || {});
