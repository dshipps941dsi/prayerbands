import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Simple in-memory cache — refreshes every 5 minutes
let faqCache: { question: string; answer: string }[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getFaqEntries(supabase: SupabaseClient) {
  const now = Date.now();
  if (faqCache.length > 0 && now - cacheTime < CACHE_TTL) {
    return faqCache;
  }

  const { data, error } = await supabase
    .from("faq_entries")
    .select("question, answer")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[FAQ Search] Supabase error:", error);
    return faqCache; // return stale cache on error
  }

  faqCache = data || [];
  cacheTime = now;
  return faqCache;
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 10) {
      return NextResponse.json({ matches: [] });
    }

    const faqEntries = await getFaqEntries(supabase);

    if (faqEntries.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const faqList = faqEntries
      .map((e, i) => `[${i}] Q: ${e.question}\nA: ${e.answer}`)
      .join("\n\n");

    const prompt = `You are a helpful assistant for PrayerBands.com, a faith-based ministry platform where people pass prayer wristbands between each other.

A user is typing a contact form message. Find FAQ entries that answer their question.

USER'S MESSAGE:
"${query.trim()}"

FAQ ENTRIES:
${faqList}

Return ONLY a JSON array (no markdown, no explanation) of the top matching entries. Each item:
{
  "index": number,        // index from the list above
  "confidence": "high" | "medium" | "low"
}

Rules:
- "high" = the FAQ directly and completely answers the question
- "medium" = the FAQ partially answers or is closely related  
- "low" = loosely related
- Return at most 3 matches
- Return [] if nothing is relevant (score below 0.3 relevance)
- Only return matches that would genuinely help the user`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let indices: { index: number; confidence: "high" | "medium" | "low" }[] = [];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      indices = JSON.parse(clean);
    } catch {
      return NextResponse.json({ matches: [] });
    }

    const matches = indices
      .filter((m) => m.index >= 0 && m.index < faqEntries.length)
      .map((m) => ({
        question: faqEntries[m.index].question,
        answer: faqEntries[m.index].answer,
        confidence: m.confidence,
      }));

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[FAQ Search] Error:", error);
    return NextResponse.json({ matches: [] }); // Silently fail — don't block form
  }
}