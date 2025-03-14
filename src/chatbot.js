import readline from 'readline';
import {fileURLToPath} from "url";
import path from "path";
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

// Function to initialize the chatbot
async function initializeChatbot() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const llama = await getLlama();
  const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "mistral-7b-instruct-v0.2.Q4_K_M.gguf")
  });
  const context = await model.createContext();
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });

  return session;
}

// Function to handle user input and generate responses
async function chat(session) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.setPrompt('You > ');
  console.log()
  rl.prompt();

  rl.on('line', async (input) => {
    const response = await session.prompt(input);
    console.log()
    console.log(`AI >> ${response}`);    
    
    console.log()
    rl.prompt();
  }).on('close', () => {
    logWithColorBackground('Chat ended, bye bye.', 'green');
    process.exit(0);
  });
}

// Function to clear the console screen
function clearScreen() {
    process.stdout.write('\x1Bc');
}

// Function to log a message with a colored background
function logWithColorBackground(message, backgroundColor) {
    const reset = '\x1b[0m';
    const bgColorCode = {
      black: '\x1b[40m',
      red: '\x1b[41m',
      green: '\x1b[42m',
      yellow: '\x1b[43m',
      blue: '\x1b[44m',
      magenta: '\x1b[45m',
      cyan: '\x1b[46m',
      white: '\x1b[47m',
    };
  
    const bgCode = bgColorCode[backgroundColor.toLowerCase()] || bgColorCode.black;
    console.log(`${bgCode}%s${reset}`, message);
}

// Main function to start the chatbot
(async () => {
  const session = await initializeChatbot();
  clearScreen();
  logWithColorBackground("Chatbot initialized. Let's chat!", 'green')
  chat(session);
})();

/*
   node-llama-cpp
   https://www.npmjs.com/package/node-llama-cpp   

   mistral-7b-instruct-v0.2.Q4_K_M.gguf
   https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF
*/