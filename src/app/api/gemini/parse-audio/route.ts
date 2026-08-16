import { NextRequest, NextResponse } from "next/server";
import { parseAudioWithGeminiServer } from "@/lib/gemini";
import { StaffContact } from "@/types";

export const maxDuration = 60; // Allow up to 60s for processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audioBase64, mimeType, staffList } = body as {
      audioBase64: string;
      mimeType: string;
      staffList: StaffContact[];
    };

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: "No audio data provided" },
        { status: 400 }
      );
    }

    const result = await parseAudioWithGeminiServer(
      audioBase64,
      mimeType || "audio/webm",
      staffList || []
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[Gemini Parse Audio Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process audio with Gemini",
      },
      { status: 500 }
    );
  }
}
