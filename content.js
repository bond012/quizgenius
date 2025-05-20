
// Global variables
let answerWindow = null;
let questionElements = [];
let processedElements = new Set(); // Track processed elements to avoid duplication
let buttonsVisible = true; // Default visibility state

// Wait for the DOM to be fully loaded
window.addEventListener('load', async () => {
  try {
    // Import required modules
    const openaiModule = await import(chrome.runtime.getURL('src/utils/openai-service.js'));
    const { getQuestionAnswer, getQuestionExplanation, parseMultipleChoiceAnswer } = openaiModule;
    
    // Set up global references to imported functions
    window.getQuestionAnswer = getQuestionAnswer;
    window.getQuestionExplanation = getQuestionExplanation;
    window.parseMultipleChoiceAnswer = parseMultipleChoiceAnswer;
    
    // Check button visibility preference
    chrome.storage.local.get(['buttonsVisible'], (data) => {
      // Set the buttons visibility state
      buttonsVisible = data.buttonsVisible !== false; // Default to true if undefined
      
      setTimeout(detectQuestions, 1000); // Give the page a moment to fully render
    });
  } catch (error) {
    console.error("Error loading required modules:", error);
  }
});

// Listen for messages from the background script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processScreenshot') {
    // Process screenshot data sent from popup
    processScreenshotQuestion(message.imageData, message.questionText);
  } else if (message.action === 'updateButtonVisibility') {
    // Update button visibility based on user preference
    buttonsVisible = message.visible;
    updateButtonVisibility();
  }
  return true;
});

// Function to update the visibility of all QuizGenius buttons
function updateButtonVisibility() {
  const buttonContainers = document.querySelectorAll('.quiz-genius-button-container');
  
  buttonContainers.forEach(container => {
    container.style.display = buttonsVisible ? 'inline-flex' : 'none';
  });
}

// Function to detect questions on the page
function detectQuestions() {
  // Get all paragraphs and list items
  const elements = [...document.querySelectorAll('p, li, div, span, h1, h2, h3, h4, h5, h6')];
  
  elements.forEach(element => {
    // Skip elements that are too small or already processed
    if (element.textContent.trim().length < 2 || // Minimum length for a question
        processedElements.has(element) || 
        element.closest('.quiz-genius-answer-window')) {
      return;
    }
    
    // Check if the element contains a question
    if (isQuestion(element)) {
      processQuestionElement(element);
    }
  });
  
  // Also look for specific quiz structures (like multiple choice questions)
  detectMultipleChoiceQuestions();
  
  // Apply visibility settings to all buttons
  updateButtonVisibility();
}

// Function to determine if text is likely a question
function isQuestion(element) {
  const text = element.textContent.trim();
  
  // More strict heuristics to detect questions
  if (text.endsWith('?')) {
    // Check for common question patterns with question mark
    const questionWordRegex = /\b(what|who|when|where|why|how|which|explain|describe|compare|contrast|analyze|evaluate|discuss|define|identify|calculate|determine|solve|find|list|state|outline|summarize)\b/i;
    return questionWordRegex.test(text);
  }
  
  // Check for numbered questions (e.g., "1. What is...")
  if (text.match(/^\d+\.\s+.{10,}/) || text.match(/^[a-z]\)\s+.{10,}/i)) {
    const questionWordRegex = /\b(what|who|when|where|why|how|which|explain|describe|compare|contrast|analyze|evaluate|discuss|define|identify|calculate|determine|solve|find|list|state|outline|summarize)\b/i;
    return questionWordRegex.test(text);
  }
  
  return false;
}

// Process a question element
function processQuestionElement(element) {
  // Mark as processed using Set
  processedElements.add(element);
  questionElements.push(element);
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'quiz-genius-button-container';
  // Set initial visibility based on user preference
  buttonContainer.style.display = buttonsVisible ? 'inline-flex' : 'none';
  
  // Create "Show Answer" button
  const showAnswerButton = document.createElement('button');
  showAnswerButton.className = 'quiz-genius-button show-answer';
  showAnswerButton.textContent = 'Show Answer';
  showAnswerButton.addEventListener('click', () => handleShowAnswer(element));
  
  // Create "Why?" button
  const whyButton = document.createElement('button');
  whyButton.className = 'quiz-genius-button why-button';
  whyButton.textContent = 'Why?';
  whyButton.addEventListener('click', () => handleWhyClicked(element));
  
  // Add buttons to container
  buttonContainer.appendChild(showAnswerButton);
  buttonContainer.appendChild(whyButton);
  
  // Position the button container after the question
  element.style.position = 'relative';
  element.parentNode.insertBefore(buttonContainer, element.nextSibling);
}

// Process a screenshot question
async function processScreenshotQuestion(imageData, questionText) {
  try {
    // Show loading state
    showOrCreateAnswerWindow('Analyzing screenshot...');
    
    // Get the imported functions
    const { getQuestionAnswer } = await import('./src/utils/openai-service.js');
    
    // Get answer from OpenAI API
    if (imageData && questionText) {
      // Both image and text are available
      getQuestionWithScreenshot(imageData, questionText, getQuestionAnswer);
    } else if (questionText) {
      // Only text is available
      getTextOnlyAnswer(questionText, getQuestionAnswer);
    } else if (imageData) {
      // Only image is available
      getImageOnlyAnswer(imageData, getQuestionAnswer);
    }
  } catch (error) {
    console.error('Error processing screenshot:', error);
    showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to process screenshot'}`);
  }
}

// Function to get answer for text+image question
async function getQuestionWithScreenshot(imageData, questionText, getQuestionAnswer) {
  try {
    const answer = await getQuestionAnswer(questionText, null, imageData);
    showOrCreateAnswerWindow(`<strong>Question:</strong> ${questionText}<br><br><strong>Answer:</strong> ${answer}`);
  } catch (error) {
    console.error('Error getting answer with screenshot:', error);
    showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
  }
}

// Function to get answer for text-only question
async function getTextOnlyAnswer(questionText, getQuestionAnswer) {
  try {
    const answer = await getQuestionAnswer(questionText);
    showOrCreateAnswerWindow(`<strong>Question:</strong> ${questionText}<br><br><strong>Answer:</strong> ${answer}`);
  } catch (error) {
    console.error('Error getting text-only answer:', error);
    showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
  }
}

// Function to get answer for image-only question
async function getImageOnlyAnswer(imageData, getQuestionAnswer) {
  try {
    const answer = await getQuestionAnswer("What's in this image?", null, imageData);
    showOrCreateAnswerWindow(`<strong>Answer based on screenshot:</strong> ${answer}`);
  } catch (error) {
    console.error('Error getting image-only answer:', error);
    showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
  }
}

// Handle "Show Answer" button click
async function handleShowAnswer(questionElement) {
  // Get the question text
  const questionText = questionElement.textContent.trim();
  
  // Import required functions
  const { getQuestionAnswer, parseMultipleChoiceAnswer } = await import('./src/utils/openai-service.js');
  
  // Look for multiple choice options
  const options = findMultipleChoiceOptions(questionElement);
  
  if (options.length > 0) {
    // Handle multiple choice question
    try {
      // Show loading state
      showOrCreateAnswerWindow('Analyzing multiple choice question...');
      
      // Get answer from OpenAI API
      getQuestionAnswer(questionText, options).then(answer => {
        // Parse the answer to find the correct option
        const correctIndex = parseMultipleChoiceAnswer(answer, options);
        
        // Highlight the correct answer
        options.forEach((option, index) => {
          if (index === correctIndex) {
            option.element.classList.add('quiz-genius-correct-answer');
          }
        });
        
        // Display the answer in the window
        showOrCreateAnswerWindow(`The correct answer is: ${options[correctIndex].text}<br><br>AI says: ${answer}`);
      }).catch(error => {
        console.error('Error getting answer:', error);
        showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
      });
    } catch (error) {
      console.error('Error getting answer:', error);
      showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
    }
  } else {
    // Handle open-ended question
    try {
      // Show loading state
      showOrCreateAnswerWindow('Generating answer...');
      
      // Get answer from OpenAI API
      getQuestionAnswer(questionText).then(answer => {
        // Display the answer
        showOrCreateAnswerWindow(answer);
      }).catch(error => {
        console.error('Error getting answer:', error);
        showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
      });
    } catch (error) {
      console.error('Error getting answer:', error);
      showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get answer'}`);
    }
  }
}

// Handle "Why?" button click
async function handleWhyClicked(questionElement) {
  const questionText = questionElement.textContent.trim();
  
  // Import required functions
  const { getQuestionExplanation } = await import('./src/utils/openai-service.js');
  
  const options = findMultipleChoiceOptions(questionElement);
  
  // Show loading state
  showOrCreateAnswerWindow('Generating explanation...');
  
  try {
    // Get explanation from OpenAI API
    getQuestionExplanation(questionText, options).then(explanation => {
      // Display the explanation
      showOrCreateAnswerWindow(explanation);
    }).catch(error => {
      console.error('Error getting explanation:', error);
      showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get explanation'}`);
    });
  } catch (error) {
    console.error('Error getting explanation:', error);
    showOrCreateAnswerWindow(`Error: ${error.message || 'Failed to get explanation'}`);
  }
}

// Find multiple choice options related to a question
function findMultipleChoiceOptions(questionElement) {
  const options = [];
  
  // Look for list items after the question
  let currentElement = questionElement.nextElementSibling;
  while (currentElement && options.length < 5) {
    // Check for common multiple choice patterns
    if (currentElement.tagName === 'LI' || 
        currentElement.textContent.match(/^[A-D][\.)]\s/) ||
        currentElement.querySelector('input[type="radio"]')) {
      
      options.push({
        element: currentElement,
        text: currentElement.textContent.trim()
      });
    }
    
    currentElement = currentElement.nextElementSibling;
  }
  
  return options;
}

// Create or update the answer window
function showOrCreateAnswerWindow(content) {
  if (!answerWindow) {
    // Create new answer window
    answerWindow = document.createElement('div');
    answerWindow.className = 'quiz-genius-answer-window';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'quiz-genius-answer-header';
    
    const title = document.createElement('div');
    title.className = 'quiz-genius-answer-title';
    title.textContent = 'QuizGenius';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'quiz-genius-close-button';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      answerWindow.classList.add('quiz-genius-hidden');
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create content area
    const contentArea = document.createElement('div');
    contentArea.className = 'quiz-genius-answer-content';
    
    answerWindow.appendChild(header);
    answerWindow.appendChild(contentArea);
    document.body.appendChild(answerWindow);
  } else {
    // Show the window if it was hidden
    answerWindow.classList.remove('quiz-genius-hidden');
  }
  
  // Update content
  const contentArea = answerWindow.querySelector('.quiz-genius-answer-content');
  contentArea.innerHTML = typeof content === 'string' ? content : content.outerHTML;
}

// Detect specific multiple choice question formats
function detectMultipleChoiceQuestions() {
  // Look for common quiz structure patterns
  // For example, forms with radio buttons
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const radioGroups = {};
    
    // Group radio buttons by name
    form.querySelectorAll('input[type="radio"]').forEach(radio => {
      const name = radio.getAttribute('name');
      if (!name) return;
      
      if (!radioGroups[name]) {
        radioGroups[name] = [];
      }
      radioGroups[name].push(radio);
    });
    
    // Process each group as a potential question
    Object.entries(radioGroups).forEach(([name, radios]) => {
      if (radios.length > 1) {
        // Look for a label or text that could be the question
        let questionElement = null;
        
        // Try to find a label associated with this group
        const labels = form.querySelectorAll(`label[for="${name}"], legend`);
        labels.forEach(label => {
          if (label.textContent.trim().length > 10 && !processedElements.has(label) && isQuestion(label)) {
            questionElement = label;
          }
        });
        
        // If we found a question, process it
        if (questionElement) {
          processQuestionElement(questionElement);
        }
      }
    });
  });
}
