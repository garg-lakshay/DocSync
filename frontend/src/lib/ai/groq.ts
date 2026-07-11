type GroqMessage = { role: "user"; content: string };

async function callGroq(
  messages: GroqMessage[],
  options: { max_tokens: number; temperature: number; logTag: string }
): Promise<string | null> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[${options.logTag}] Groq error:`, response.status, errText);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error(`[${options.logTag}] Groq request failed:`, error);
    return null;
  }
}

export async function generateVersionLabel(
  plainText: string
): Promise<string | null> {
  if (!plainText.trim()) {
    console.warn("[version-label] Skipping Groq: empty plainText");
    return null;
  }

  const raw = await callGroq(
    [
      {
        role: "user",
        content: `Summarize what changed in this document in under 8 words, git-commit-message style. Return only the label, no quotes:\n\n${plainText.slice(0, 2000)}`,
      },
    ],
    { max_tokens: 20, temperature: 0.2, logTag: "version-label" }
  );

  return raw?.replace(/^["']|["']$/g, "") ?? null;
}

export async function generateDocumentSummary(
  plainText: string
): Promise<string | null> {
  if (!plainText.trim()) {
    console.warn("[document-summary] Skipping Groq: empty plainText");
    return null;
  }

  return callGroq(
    [
      {
        role: "user",
        content: `Summarize this document in 2-3 sentences for someone who hasn't read it. Return only the summary, no preamble:\n\n${plainText.slice(0, 8000)}`,
      },
    ],
    { max_tokens: 150, temperature: 0.3, logTag: "document-summary" }
  );
}
