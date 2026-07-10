export async function generateVersionLabel(
  plainText: string
): Promise<string | null> {
  if (!plainText.trim()) {
    console.warn("[version-label] Skipping Groq: empty plainText");
    return null;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Summarize what changed in this document in under 8 words, git-commit-message style. Return only the label, no quotes:\n\n${plainText.slice(0, 2000)}`,
          },
        ],
        max_tokens: 20,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[version-label] Groq error:", response.status, errText);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? null;
    return raw?.replace(/^["']|["']$/g, "") ?? null;
  } catch (error) {
    console.error("[version-label] Groq request failed:", error);
    return null;
  }
}
