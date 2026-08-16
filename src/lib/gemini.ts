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
          temperature: 0.1, // Low temperature for high precision and zero omission
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
      console.log(`[Gemini Voice Parsing] Success with model: ${modelName}. Total assignments: ${parsed.assignments.length}`);
      return parsed;
    } catch (err: any) {
      console.warn(`[Gemini Voice Parsing] Model ${modelName} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All candidate Gemini models failed to process the audio.");
}
