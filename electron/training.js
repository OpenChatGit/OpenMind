const https = require('https');

// QuantAILabs HuggingFace Organization
const HF_ORG = 'QuantAILabs';

// Check if user is member of QuantAILabs org
function checkOrgMembership(hfToken) {
  return new Promise((resolve) => {
    if (!hfToken) {
      resolve({ success: false, isMember: false, error: 'No HuggingFace token' });
      return;
    }

    const options = {
      hostname: 'huggingface.co',
      path: '/api/whoami-v2',
      headers: {
        'Authorization': `Bearer ${hfToken}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const user = JSON.parse(data);
          
          // Check if user has orgs and is member of QuantAILabs
          const orgs = user.orgs || [];
          const isMember = orgs.some(org => 
            org.name === HF_ORG || 
            org.fullname === HF_ORG ||
            org.name?.toLowerCase() === HF_ORG.toLowerCase()
          );
          
          resolve({ 
            success: true, 
            isMember,
            username: user.name,
            orgs: orgs.map(o => o.name),
          });
        } catch (error) {
          resolve({ success: false, isMember: false, error: error.message });
        }
      });
    }).on('error', (error) => {
      resolve({ success: false, isMember: false, error: error.message });
    });
  });
}

// Get available base models for finetuning
function getBaseModels() {
  return [
    { 
      id: 'meta-llama/Llama-3.2-1B', 
      name: 'Llama 3.2 1B', 
      size: '1B',
      description: 'Compact model, fast training',
      recommended: true,
    },
    { 
      id: 'meta-llama/Llama-3.2-3B', 
      name: 'Llama 3.2 3B', 
      size: '3B',
      description: 'Good balance of size and capability',
      recommended: true,
    },
    { 
      id: 'Qwen/Qwen2.5-1.5B', 
      name: 'Qwen 2.5 1.5B', 
      size: '1.5B',
      description: 'Efficient multilingual model',
    },
    { 
      id: 'Qwen/Qwen2.5-3B', 
      name: 'Qwen 2.5 3B', 
      size: '3B',
      description: 'Strong multilingual capabilities',
    },
    { 
      id: 'microsoft/Phi-3.5-mini-instruct', 
      name: 'Phi 3.5 Mini', 
      size: '3.8B',
      description: 'Microsoft\'s efficient model',
    },
    { 
      id: 'google/gemma-2-2b', 
      name: 'Gemma 2 2B', 
      size: '2B',
      description: 'Google\'s lightweight model',
    },
  ];
}

// Get training presets
function getTrainingPresets() {
  return [
    {
      id: 'quick',
      name: 'Quick Train',
      description: '~30 min, good for testing',
      epochs: 1,
      batchSize: 4,
      learningRate: 2e-4,
      loraRank: 8,
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: '~2 hours, recommended',
      epochs: 3,
      batchSize: 4,
      learningRate: 1e-4,
      loraRank: 16,
      recommended: true,
    },
    {
      id: 'thorough',
      name: 'Thorough',
      description: '~4 hours, best quality',
      epochs: 5,
      batchSize: 2,
      learningRate: 5e-5,
      loraRank: 32,
    },
  ];
}

// Validate training data format
function validateTrainingData(data, format) {
  try {
    const lines = data.trim().split('\n');
    
    if (lines.length < 10) {
      return { valid: false, error: 'Need at least 10 examples for training' };
    }
    
    if (format === 'chat') {
      // Expect JSONL with messages array
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const parsed = JSON.parse(lines[i]);
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
          return { valid: false, error: `Line ${i + 1}: Missing 'messages' array` };
        }
      }
    } else if (format === 'instruction') {
      // Expect JSONL with instruction/input/output
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const parsed = JSON.parse(lines[i]);
        if (!parsed.instruction || !parsed.output) {
          return { valid: false, error: `Line ${i + 1}: Missing 'instruction' or 'output' field` };
        }
      }
    } else if (format === 'completion') {
      // Expect JSONL with text field
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const parsed = JSON.parse(lines[i]);
        if (!parsed.text) {
          return { valid: false, error: `Line ${i + 1}: Missing 'text' field` };
        }
      }
    }
    
    return { valid: true, count: lines.length };
  } catch (error) {
    return { valid: false, error: `Invalid JSON: ${error.message}` };
  }
}

// Start training job (placeholder - will connect to HF Space)
async function startTraining(config, hfToken) {
  // This will be implemented to communicate with the HF Space
  // For now, return a placeholder
  return {
    success: false,
    error: 'Training backend not yet configured. Coming soon!',
    jobId: null,
  };
}

// Check training job status (placeholder)
async function checkTrainingStatus(jobId, hfToken) {
  return {
    success: false,
    error: 'Training backend not yet configured',
    status: 'unknown',
  };
}

// Subscription tiers
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Local model management',
      'Cloud model browsing',
      'GGUF downloads',
    ],
    training: false,
  },
  pro: {
    name: 'Pro',
    price: 25, // EUR
    features: [
      'Everything in Free',
      'H200 GPU access for training',
      'Daily GPU minutes refresh',
      'Priority support',
      'Early access to new features',
    ],
    training: true,
    gpuMinutesPerDay: 60, // 60 minutes per day
  },
};

function getSubscriptionTiers() {
  return SUBSCRIPTION_TIERS;
}

module.exports = {
  HF_ORG,
  checkOrgMembership,
  getBaseModels,
  getTrainingPresets,
  validateTrainingData,
  startTraining,
  checkTrainingStatus,
  getSubscriptionTiers,
};
