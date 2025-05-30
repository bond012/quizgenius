
// OpenRouter API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'model-name'; // Using GPT-4o model via OpenRouter replace with actual model name

// API key - PASTE YOUR API KEY HERE
const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY_HERE'; // <-- REPLACE THIS WITH YOUR ACTUAL OPENROUTER API KEY

// Site information for OpenRouter leaderboards
const SITE_URL = 'https://quizgenius.app';
const SITE_NAME = 'QuizGenius';

// Function to get API key
const getApiKey = async () => {
  return OPENROUTER_API_KEY;
};

// Function to check if API key exists
const hasApiKey = async () => {
  return OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE'; // Only return true if key has been changed
};

export { 
  OPENROUTER_API_URL, 
  OPENROUTER_MODEL, 
  SITE_URL, 
  SITE_NAME,
  getApiKey, 
  hasApiKey 
};
