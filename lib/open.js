const axios = require("axios");

class AIService {
  constructor() {
    this.providers = {
      openai: {
        enabled: process.env.OPENAI_API_KEY || false,
        apiKey: process.env.OPENAI_API_KEY,
      },
      ollama: {
        enabled: process.env.OLLAMA_HOST || false,
        host: process.env.OLLAMA_HOST || "http://localhost:11434",
      },
      huggingface: {
        enabled: process.env.HUGGINGFACE_API_KEY || false,
        apiKey: process.env.HUGGINGFACE_API_KEY,
      },
      gemini: {
        enabled: process.env.GOOGLE_API_KEY || false,
        apiKey: process.env.GOOGLE_API_KEY,
      },
    };
  }

  async summarizeWithOpenAI(content, competitorName) {
    try {
      const { OpenAI } = require("openai");
      const openai = new OpenAI({ apiKey: this.providers.openai.apiKey });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective model
        messages: [
          {
            role: "system",
            content: `You are a competitive intelligence analyst. Analyze competitor content and provide actionable business insights.

Categories: Product, Marketing, Hiring, Funding, Partnership, Pricing, Leadership, Customer
Impact Levels: Low, Medium, High, Critical

Always include:
1. 2-3 sentence summary
2. Category tag
3. Impact level
4. Recommended action`,
          },
          {
            role: "user",
            content: `
Competitor: ${competitorName}
Content: "${content}"

Provide analysis in this format:
Summary: [2-3 sentences about what happened and why it matters]
Category: [one of the categories above]
Impact: [impact level]
Action: [specific recommended action for our business]`,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return (
        response.choices[0].message.content ||
        "Failed to generate summary with OpenAI"
      );
    } catch (error) {
      console.error("OpenAI API error:", error.message);
      throw error;
    }
  }

  async summarizeWithOllama(content, competitorName) {
    try {
      const prompt = this.buildPrompt(content, competitorName);

      const response = await axios.post(
        `${this.providers.ollama.host}/api/generate`,
        {
          model: "llama3.2:3b", // Lightweight model
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 300,
          },
        },
        {
          timeout: 30000,
        }
      );

      return response.data.response || "Failed to generate summary with Ollama";
    } catch (error) {
      console.error("Ollama API error:", error.message);
      throw error;
    }
  }

  async summarizeWithHuggingFace(content, competitorName) {
    try {
      const prompt = this.buildPrompt(content, competitorName);

      const response = await axios.post(
        "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
        {
          inputs: prompt,
          parameters: {
            max_length: 300,
            temperature: 0.3,
            do_sample: true,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.providers.huggingface.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return (
        response.data[0]?.generated_text ||
        "Failed to generate summary with Hugging Face"
      );
    } catch (error) {
      console.error("Hugging Face API error:", error.message);
      throw error;
    }
  }

  async summarizeWithGemini(content, competitorName) {
    try {
      const prompt = this.buildPrompt(content, competitorName);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.providers.gemini.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return (
        response.data.candidates[0]?.content?.parts[0]?.text ||
        "Failed to generate summary with Gemini"
      );
    } catch (error) {
      console.error("Gemini API error:", error.message);
      throw error;
    }
  }

  buildPrompt(content, competitorName) {
    return `You are a competitive intelligence analyst. Analyze this competitor content and provide actionable business insights.

Competitor: ${competitorName}
Content: "${content.slice(0, 1500)}"

Categories: Product, Marketing, Hiring, Funding, Partnership, Pricing, Leadership, Customer
Impact Levels: Low, Medium, High, Critical

Provide analysis in this exact format:
Summary: [2-3 sentences about what happened and why it matters]
Category: [one category from the list above]
Impact: [impact level]
Action: [specific recommended action for our business]

Keep the response concise and focused on business implications.`;
  }

  async summarizeContent(content, competitorName = "competitor") {
    // Try providers in order of preference (OpenAI first if available, then free alternatives)
    const providers = [
      { name: "openai", method: this.summarizeWithOpenAI.bind(this) },
      { name: "ollama", method: this.summarizeWithOllama.bind(this) },
      { name: "gemini", method: this.summarizeWithGemini.bind(this) },
      { name: "huggingface", method: this.summarizeWithHuggingFace.bind(this) },
    ];

    for (const provider of providers) {
      if (this.providers[provider.name].enabled) {
        try {
          console.log(
            `🤖 Using ${provider.name.toUpperCase()} for AI analysis...`
          );
          const result = await provider.method(content, competitorName);
          return result;
        } catch (error) {
          console.log(
            `⚠️  ${provider.name.toUpperCase()} failed, trying next provider...`
          );
          continue;
        }
      }
    }

    // Fallback to rule-based analysis if no AI providers are available
    console.log("⚠️  No AI providers available, using rule-based analysis...");
    return this.ruleBasedSummary(content, competitorName);
  }

  ruleBasedSummary(content, competitorName) {
    const keywords = {
      product: [
        "launch",
        "feature",
        "update",
        "release",
        "version",
        "beta",
        "product",
      ],
      marketing: [
        "campaign",
        "brand",
        "marketing",
        "advertisement",
        "promotion",
        "social",
      ],
      hiring: ["hiring", "job", "team", "employee", "recruit", "position"],
      funding: [
        "funding",
        "investment",
        "round",
        "capital",
        "investor",
        "valuation",
      ],
      partnership: [
        "partner",
        "collaboration",
        "alliance",
        "integration",
        "deal",
      ],
      leadership: [
        "ceo",
        "cto",
        "founder",
        "executive",
        "leadership",
        "appointment",
      ],
    };

    let category = "Product";
    let impact = "Medium";

    const lowerContent = content.toLowerCase();

    // Determine category based on keywords
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some((word) => lowerContent.includes(word))) {
        category = cat.charAt(0).toUpperCase() + cat.slice(1);
        break;
      }
    }

    // Determine impact based on content length and certain keywords
    if (
      lowerContent.includes("major") ||
      lowerContent.includes("significant") ||
      lowerContent.includes("breakthrough")
    ) {
      impact = "High";
    } else if (
      lowerContent.includes("minor") ||
      lowerContent.includes("small") ||
      content.length < 200
    ) {
      impact = "Low";
    }

    const summary = `${competitorName} has published content related to ${category.toLowerCase()}. ${content.slice(
      0,
      150
    )}...`;

    return `Summary: ${summary}
Category: ${category}
Impact: ${impact}
Action: Monitor ${competitorName}'s ${category.toLowerCase()} developments and assess competitive implications for our business.`;
  }
}

const aiService = new AIService();

async function summarizeContent(content, competitorName = "competitor") {
  return await aiService.summarizeContent(content, competitorName);
}

module.exports = { summarizeContent, AIService };
