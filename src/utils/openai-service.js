// Import API config
import { OPENROUTER_API_URL, OPENROUTER_MODEL, SITE_URL, SITE_NAME, getApiKey } from './api-config.js';

// Function to get an answer to a question using OpenRouter API
async function getQuestionAnswer(question, options = null, imageData = null) {
  try {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    // Prepare messages for OpenRouter
    const messages = [
      {
        role: 'system',
        content: 'You are QuizGenius, an AI assistant specialized in answering educational questions accurately and concisely.'
      },
      {
        role: 'user',
        content: []
      }
    ];
    
    // Add text content
    let promptText = question;
    
    if (options && options.length > 0) {
      promptText += '\n\nOptions:\n' + options.map((option, index) => 
        `${String.fromCharCode(65 + index)}) ${option.text}`
      ).join('\n');
      
      promptText += '\n\nPlease select the correct answer and explain why it is correct.';
    }
    
    messages[1].content = promptText;
    
    // Prepare request data for OpenRouter API
    const requestData = {
      model: OPENROUTER_MODEL,
      messages: messages,
      max_tokens: 500,
      temperature: 0.3,
    };
    
    // Handle image content separately if available
    if (imageData) {
      // For image processing, we'll need to adjust our approach
      // OpenRouter might handle this differently from OpenAI's direct API
      // For now, we'll inform the user that image processing works differently
      console.log("Processing image with content...");
      
      // Since OpenRouter doesn't directly support image processing in the same way,
      // we'll add this as text for now
      messages.push({
        role: "user",
        content: "Note: There is also an image provided with this question. Please consider the image when answering."
      });
    }
    
    console.log('Sending request to OpenRouter API:', JSON.stringify(requestData));
    
    // Make API request with OpenRouter-specific headers
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': SITE_URL, // For OpenRouter leaderboards
        'X-Title': SITE_NAME      // For OpenRouter leaderboards
      },
      body: JSON.stringify(requestData)
    });
    
    // Check if response is ok
    if (!response.ok) {
      const responseText = await response.text();
      console.error('OpenRouter API error response:', responseText);
      
      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error?.message || `API returned status ${response.status}`);
      } catch (jsonError) {
        // If can't parse as JSON, use the text response
        throw new Error(`API returned status ${response.status}: ${responseText.substring(0, 100)}...`);
      }
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No answer received from OpenRouter');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in getQuestionAnswer:', error);
    throw error;
  }
}

// Function to get a detailed explanation for a question
async function getQuestionExplanation(question, options = null) {
  try {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    // Prepare prompt for OpenRouter
    let prompt = `Question: ${question}`;
    
    if (options && options.length > 0) {
      prompt += '\n\nOptions:\n' + options.map((option, index) => 
        `${String.fromCharCode(65 + index)}) ${option.text}`
      ).join('\n');
    }
    
    prompt += '\n\nPlease provide a detailed explanation of the correct answer, including any relevant concepts, formulas, or reasoning processes.';
    
    // Prepare request data with updated format for OpenRouter
    const requestData = {
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are QuizGenius, an AI tutor specialized in providing detailed, educational explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.5,
    };
    
    // Make API request with OpenRouter-specific headers
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      },
      body: JSON.stringify(requestData)
    });
    
    // Check if response is ok
    if (!response.ok) {
      const responseText = await response.text();
      console.error('OpenRouter API error response:', responseText);
      
      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error?.message || `API returned status ${response.status}`);
      } catch (jsonError) {
        // If can't parse as JSON, use the text response
        throw new Error(`API returned status ${response.status}: ${responseText.substring(0, 100)}...`);
      }
    }
    
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No explanation received from OpenRouter');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in getQuestionExplanation:', error);
    throw error;
  }
}

// Function to parse multiple choice answer to find correct option
function parseMultipleChoiceAnswer(answer, options) {
  // Look for option indicators like 'A)', 'B)', 'option A', etc.
  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
  
  for (let i = 0; i < optionLetters.length && i < options.length; i++) {
    const letter = optionLetters[i];
    const patterns = [
      new RegExp(`\\b${letter}\\)`, 'i'),
      new RegExp(`option\\s*${letter}\\b`, 'i'),
      new RegExp(`answer\\s*${letter}\\b`, 'i'),
      new RegExp(`^${letter}\\b`, 'i'),
      new RegExp(`\\b${letter}\\s*is\\s*correct`, 'i')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(answer)) {
        return i;
      }
    }
  }
  
  // If no clear match found, look for content matching
  const optionContents = options.map(option => option.text.toLowerCase());
  const answerLower = answer.toLowerCase();
  
  for (let i = 0; i < options.length; i++) {
    const content = optionContents[i];
    const contentWords = content.split(' ').filter(word => word.length > 4);
    
    // Count how many significant words from this option appear in the answer
    let matchCount = 0;
    for (const word of contentWords) {
      if (answerLower.includes(word)) {
        matchCount++;
      }
    }
    
    // If more than half the significant words appear, it's likely this option
    if (contentWords.length > 0 && matchCount >= Math.ceil(contentWords.length / 2)) {
      return i;
    }
  }
  
  // If still no match, default to first option
  return 0;
}

export { getQuestionAnswer, getQuestionExplanation, parseMultipleChoiceAnswer };
