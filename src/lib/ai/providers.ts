import "server-only";

// Vercel AI SDK provider wiring. Real model selection lives here in later
// phases (Groq for chat, Anthropic for high-stakes, OpenAI for embeddings).
// For now we just centralise the env-var contract so server-only code never
// reaches into `process.env` directly.

export const aiEnv = {
  anthropicKey: () => process.env.ANTHROPIC_API_KEY ?? "",
  openaiKey: () => process.env.OPENAI_API_KEY ?? "",
  groqKey: () => process.env.GROQ_API_KEY ?? "",
} as const;
