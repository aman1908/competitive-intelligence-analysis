# competitive-intelligence-analysis
An intelligent agent that monitors competitor websites, social media, and press releases, then summarizes key changes and sends actionable insights daily or weekly.

## 🚀 Features

- **Multi-Source Monitoring**: RSS feeds, website changes, social media
- **AI-Powered Analysis**: Multiple AI providers with automatic fallback
- **Smart Categorization**: Product, Marketing, Hiring, Funding, Partnership, etc.
- **Website Change Detection**: Automated monitoring with content comparison
- **Automated Scheduling**: Configurable RSS and website monitoring schedules
- **Multiple Delivery Options**: Email, Slack, or file output
- **Cost-Effective**: Supports both paid and free AI providers
- **Professional Email Reports**: Beautiful HTML templates with impact highlighting

## 🤖 AI Provider Options

### 1. OpenAI (Paid - Most Accurate)
- **Cost**: ~$0.001-0.002 per analysis
- **Quality**: Highest accuracy and insight quality
- **Setup**: Requires API key from OpenAI

### 2. Ollama (Free - Local)
- **Cost**: Completely free
- **Quality**: Good for basic analysis
- **Setup**: Requires local installation
- **Models**: llama3.2:3b (recommended), llama3.2:1b (faster)

### 3. Google Gemini (Free Tier)
- **Cost**: Free up to 15 requests/minute
- **Quality**: Good accuracy
- **Setup**: Requires Google API key

### 4. Hugging Face (Free Tier)
- **Cost**: Free with rate limits
- **Quality**: Basic analysis
- **Setup**: Requires Hugging Face token

### 5. Rule-Based Analysis (Free)
- **Cost**: Completely free
- **Quality**: Basic keyword-based categorization
- **Setup**: No configuration needed

## 📦 Installation

```bash
# Clone the repository
cd competitive-intelligence-analysis

# Install dependencies
npm install

# Run interactive setup
npm run setup
```

## ⚙️ Configuration

### Quick Setup
```bash
npm run setup
```

### Manual Configuration
1. Copy `.env.example` to `.env`
2. Configure your preferred AI provider:

```bash
# For OpenAI (paid)
OPENAI_API_KEY=sk-your_openai_api_key_here

# For Ollama (free, local)
OLLAMA_HOST=http://localhost:11434

# For Google Gemini (free tier)
GOOGLE_API_KEY=your_google_api_key_here

# For Hugging Face (free tier)
HUGGINGFACE_API_KEY=your_huggingface_token_here
```

3. Edit `config/competitors.json` to add your competitors:

```json
{
  "competitors": [
    {
      "id": "competitor-1",
      "name": "Competitor Name",
      "sources": {
        "rss": ["https://competitor.com/blog/feed"],
        "websites": ["https://competitor.com/", "https://competitor.com/blog"],
        "social": {
          "twitter": "@competitor",
          "linkedin": "company/competitor"
        }
      },
      "priority": "high"
    }
  ]
}
```

## 🎯 Usage

### One-time Analysis
```bash
# Run RSS digest for all competitors
npm run digest

# Monitor website changes
npm run monitor
```


## 📊 Output Format

Each analysis includes:
- **Summary**: 2-3 sentences about what happened
- **Category**: Product, Marketing, Hiring, Funding, etc.
- **Impact Level**: Low, Medium, High, Critical
- **Recommended Action**: Specific next steps

Example output:
```
Summary: Mozilla announced a new privacy-focused browser feature that blocks third-party tracking by default. This could impact user acquisition for advertising-dependent competitors and signals Mozilla's continued focus on privacy as a differentiator.
Category: Product
Impact: Medium
Action: Evaluate our privacy features and consider enhancing tracking protection to remain competitive.
```

## 🔧 AI Provider Setup Guides

### Ollama (Recommended for Free Usage)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download model
ollama pull llama3.2:3b

# Start service
ollama serve
```

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create account and add billing
3. Generate API key
4. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Google Gemini
1. Go to https://makersuite.google.com/app/apikey
2. Create Google account
3. Generate API key
4. Add to `.env`: `GOOGLE_API_KEY=...`

### Hugging Face
1. Go to https://huggingface.co/settings/tokens
2. Create account
3. Generate token with "Read" permissions
4. Add to `.env`: `HUGGINGFACE_API_KEY=...`

