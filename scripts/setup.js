const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupAIProvider() {
  console.log("🚀 Welcome to Competitor Intelligence Platform Setup!\n");
  console.log("Choose your AI provider:\n");
  console.log("1. 🤖 OpenAI (Paid, most accurate, requires API key)");
  console.log("2. 🦙 Ollama (Local, completely free, requires installation)");
  console.log("3. 🤗 Hugging Face (Free tier with API key)");
  console.log("4. 🔮 Google Gemini (Free tier with API key)");
  console.log("5. 📝 Rule-based analysis (No AI, keyword-based)\n");

  const choice = await question(
    "Which AI provider would you like to use? (1-5): "
  );

  let envContent = "# Competitor Intelligence Platform Configuration\n\n";

  switch (choice) {
    case "1":
      console.log("\n🤖 Setting up OpenAI...");
      console.log("1. Go to https://platform.openai.com/api-keys");
      console.log("2. Create an account and add billing information");
      console.log("3. Create a new API key");
      console.log("4. Copy the API key (starts with sk-)");

      const openaiKey = await question("Enter your OpenAI API key: ");
      if (openaiKey) {
        envContent += `OPENAI_API_KEY=${openaiKey}\n`;
      }
      break;

    case "2":
      console.log("\n🦙 Setting up Ollama...");
      console.log("To use Ollama:");
      console.log("1. Install Ollama: https://ollama.ai/");
      console.log("2. Run: ollama pull llama3.2:3b");
      console.log("3. Start Ollama service: ollama serve");

      const ollamaHost =
        (await question("Ollama host (default: http://localhost:11434): ")) ||
        "http://localhost:11434";
      envContent += `OLLAMA_HOST=${ollamaHost}\n`;
      break;

    case "3":
      console.log("\n🤗 Setting up Hugging Face...");
      console.log("1. Go to https://huggingface.co/");
      console.log("2. Create a free account");
      console.log("3. Go to Settings > Access Tokens");
      console.log('4. Create a new token with "Read" permissions');

      const hfToken = await question("Enter your Hugging Face API token: ");
      if (hfToken) {
        envContent += `HUGGINGFACE_API_KEY=${hfToken}\n`;
      }
      break;

    case "4":
      console.log("\n🔮 Setting up Google Gemini...");
      console.log("1. Go to https://makersuite.google.com/app/apikey");
      console.log("2. Create a free Google account if needed");
      console.log('3. Click "Create API Key"');
      console.log("4. Copy the generated API key");

      const geminiKey = await question("Enter your Google Gemini API key: ");
      if (geminiKey) {
        envContent += `GOOGLE_API_KEY=${geminiKey}\n`;
      }
      break;

    case "5":
      console.log("\n📝 Using rule-based analysis (no AI provider needed)");
      envContent += "# Using rule-based analysis - no AI API keys required\n";
      break;

    default:
      console.log("Invalid choice. Using rule-based analysis as fallback.");
      envContent += "# Using rule-based analysis - no AI API keys required\n";
  }

  // Write .env file
  const envPath = path.join(process.cwd(), ".env");
  await fs.writeFile(envPath, envContent);

  console.log(`\n✅ Configuration saved to .env file`);
  console.log("\n📋 Next steps:");
  console.log("1. Edit config/competitors.json to add your competitors");
  console.log("2. Run: npm run digest (to test the setup)");
  console.log("3. Run: npm start (to start automated monitoring)");

  rl.close();
}

async function createSampleEnv() {
  const sampleEnvContent = `#Competitor Intelligence Platform Configuration
# Uncomment and configure the AI provider you want to use

# Option 1: OpenAI (Paid, most accurate)
# Get API key: https://platform.openai.com/api-keys
# OPENAI_API_KEY=sk-your_openai_api_key_here

# Option 2: Ollama (Local AI - completely free)
# Install: https://ollama.ai/
# Run: ollama pull llama3.2:3b && ollama serve
# OLLAMA_HOST=http://localhost:11434

# Option 3: Hugging Face (Free tier)
# Get API key: https://huggingface.co/settings/tokens
# HUGGINGFACE_API_KEY=your_huggingface_token_here

# Option 4: Google Gemini (Free tier)
# Get API key: https://makersuite.google.com/app/apikey
# GOOGLE_API_KEY=your_google_api_key_here

# Option 5: No configuration needed for rule-based analysis
`;

  const envPath = path.join(process.cwd(), ".env.example");
  await fs.writeFile(envPath, sampleEnvContent);
  console.log("✅ Created .env.example file with configuration options");
}

async function main() {
  try {
    await createSampleEnv();
    await setupAIProvider();
  } catch (error) {
    console.error("Setup failed:", error.message);
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupAIProvider };
