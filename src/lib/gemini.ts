import { GoogleGenAI } from "@google/genai";
import { StaffContact, VoiceParsingResponse } from "@/types";

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

export async function parseAudioWithGeminiServer(
  audioBase64: string,
  mimeType: string,
  staffList: StaffContact[]
): Promise<VoiceParsingResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const staffDirectoryJson = JSON.stringify(
    staffList.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      department: s.department,
    }))
  );

  const prompt = `You are an intelligent AI Task Dispatcher and voice transcription specialist for a high-performance business team.
Listen to the attached audio file very carefully. The speaker is delegating tasks to one or more staff members in English, Hindi, Urdu, or Hinglish (e.g. "aaj mudassir ko ye kaam karna hai...", "today's task for Mudassrio is to deploy the server and check bug...").

Here is the OFFICIAL REGISTERED STAFF DIRECTORY:
${staffDirectoryJson}

YOUR INSTRUCTIONS:
1. Provide the exact, verbatim transcription of the entire voice audio in "rawTranscription".
2. Identify all tasks assigned to people in the voice recording.
3. FUZZY MATCH & ALIGN NAMES: Match the spoken name (even if misspelled, slurred, nick-named, or mispronounced like "Mudassrio" -> "Mudassir") against the closest registered contact in the STAFF DIRECTORY above.
4. Extract each individual task cleanly with a concise, actionable "title", optional "description", "priority" (choose from: "urgent", "high", "medium", "low"), and optional "dueDate" (e.g. "Today", "Tomorrow", "EOD").
5. Group tasks by the matched staff member.
6. If any tasks are mentioned without a recognized person, put them in "unmatchedTasks".

You MUST respond ONLY with valid JSON in this exact structure without markdown formatting or code fences:
{
  "rawTranscription": "full verbatim transcription text here",
  "summary": "Brief 1-sentence executive summary of tasks assigned in this voice note",
  "assignments": [
    {
      "staffId": "id from official staff list",
      "staffName": "exact official name from staff list",
      "staffPhone": "official phone from staff list",
      "matchedSpokenName": "exact word/name as spoken in audio",
      "confidence": 0.95,
      "tasks": [
        {
          "title": "Actionable task title",
          "description": "Detail or context",
          "priority": "medium",
          "dueDate": "Today"
        }
      ]
    }
  ],
  "unmatchedTasks": []
}`;

  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini Voice Parsing] Attempting model: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
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
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text || "";
      // Clean potential markdown code blocks
      const cleanedJson = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed: VoiceParsingResponse = JSON.parse(cleanedJson);
      console.log(`[Gemini Voice Parsing] Success with model: ${modelName}`);
      return parsed;
    } catch (err: any) {
      console.warn(`[Gemini Voice Parsing] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
      // If error is 404 or capacity spike, continue loop to try next candidate model
    }
  }

  throw lastError || new Error("All candidate Gemini models failed to process the audio.");
}
