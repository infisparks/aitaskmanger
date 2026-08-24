import { StaffContact, VoiceParsingResponse } from "@/types";

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

export async function parseAudioWithGeminiClient(
  audioBase64: string,
  mimeType: string,
  staffList: StaffContact[]
): Promise<VoiceParsingResponse> {
  // Only read from environment variables as requested
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not configured in your environment variables (.env.local or Vercel Environment Variables).");
  }

  const staffDirectoryJson = JSON.stringify(
    staffList.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      department: s.department,
    }))
  );

  const prompt = `You are an expert Executive AI Task Dispatcher and voice transcription specialist for a high-performance business team.
Listen to the attached audio file with extreme attention to every single detail. The speaker is delegating tasks to one or more staff members. The speech may be in English, Hindi, Urdu, or colloquial Hinglish (e.g., "aaj mudassir ko server restart karna hai, client ko call karke payment mangni hai aur report bhi ready karni hai...").

OFFICIAL REGISTERED STAFF DIRECTORY:
${staffDirectoryJson}

CRITICAL RULES & INSTRUCTIONS:
1. ZERO SKIPPED TASKS (EXHAUSTIVE EXTRACTION):
   - You MUST NOT skip or summarize away any single action, instruction, follow-up, call, review, or task mentioned in the audio.
   - If the speaker mentions multiple things in one sentence or continuous breath (e.g. "do X, and also Y, and then check Z"), create SEPARATE atomic task items for X, Y, and Z. Never combine separate tasks into one!

2. PROFESSIONAL ENGLISH POLISHING (HINGLISH/HINDI TO BUSINESS ENGLISH):
   - Translate colloquial or Hindi/Urdu instructions into crisp, professional, business-ready English titles and clear descriptions.
   - Example Spoken: "aaj client se baat kar lena payment ke liye 4 baje tak"
     -> Title: "Follow up with client regarding pending payment"
     -> Description: "Call client before 4:00 PM to discuss and confirm payment status."
     -> Due Date: "Today by 4:00 PM"
     -> Priority: "high"

3. FUZZY MATCH & ALIGN ALL NAMES:
   - Match spoken/mispronounced names (e.g., "Mudassrio", "Mudasir", "Rehman", "Ali Bhai", etc.) to the closest registered contact in the STAFF DIRECTORY above.
   - If a task is assigned to a person, group it under their matched staffId and staffName.

4. DUE DATES & TIME SENSITIVITY:
   - Extract exact times or relative deadlines (e.g. "by 3 PM", "EOD", "Tomorrow morning", "aaj sham tak", "immediately") into the "dueDate" field.

5. ACCURATE PRIORITY:
   - Assign "urgent" (for ASAP/emergency tasks), "high" (for important/client tasks), "medium" (default normal tasks), or "low".

6. VERBATIM TRANSCRIPTION:
   - Provide the complete, accurate word-for-word spoken transcript in "rawTranscription".

You MUST output ONLY valid JSON in this exact structure without markdown code fences:
{
  "rawTranscription": "full complete transcription of every spoken word",
  "summary": "Professional 1-sentence executive summary of all assigned work",
  "assignments": [
    {
      "staffId": "id from official staff directory",
      "staffName": "exact official name from staff directory",
      "staffPhone": "official phone from staff directory",
      "matchedSpokenName": "exact word/name as pronounced in audio",
      "confidence": 0.98,
      "tasks": [
        {
          "title": "Professional and actionable task title in English",
          "description": "Clear step-by-step detail or context of what needs to be done",
          "priority": "high",
          "dueDate": "Today by 5:00 PM"
        }
      ]
    }
  ],
  "unmatchedTasks": []
}`;

  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per candidate model

    try {
      console.log(`[Client Gemini Voice Parsing] Calling Google Generative Language API with model: ${modelName}...`);
      
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: audioBase64,
                    mimeType: mimeType || "audio/webm",
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData?.error?.message || `Gemini API returned status ${res.status}`);
      }

      const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanedJson = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed: VoiceParsingResponse = JSON.parse(cleanedJson);
      console.log(`[Client Gemini Voice Parsing] Success with model: ${modelName}. Assignments count: ${parsed.assignments?.length || 0}`);
      return parsed;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[Client Gemini Voice Parsing] Model ${modelName} error:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All candidate Gemini models failed to process audio.");
}
