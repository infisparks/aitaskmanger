import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, message } = await req.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { success: false, error: "Missing phoneNumber or message" },
        { status: 400 }
      );
    }

    const apiKey = process.env.WHATSAPP_API_KEY || "vR39h6avY69g7kAU3YQbS6V6XEvudson";
    const baseUrl = process.env.WHATSAPP_API_URL || "https://evo.infispark.in";
    const instance = process.env.WHATSAPP_INSTANCE || "mudassir";

    // Clean number, ensure 91 prefix
    let cleanNumber = phoneNumber.replace(/\D/g, "");
    if (!cleanNumber.startsWith("91") && cleanNumber.length === 10) {
      cleanNumber = `91${cleanNumber}`;
    }

    const whatsappPayload = {
      number: cleanNumber,
      text: message,
    };

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/message/${instance}`;

    console.log(`[WhatsApp API] Dispatching to ${targetUrl} for ${cleanNumber}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
      body: JSON.stringify(whatsappPayload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("[WhatsApp API Error]", response.status, responseData);
      return NextResponse.json(
        { 
          success: false, 
          error: `WhatsApp API returned ${response.status}: ${JSON.stringify(responseData)}`,
          status: response.status 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      number: cleanNumber,
    });
  } catch (error: any) {
    console.error("[WhatsApp Proxy Internal Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during WhatsApp send" },
      { status: 500 }
    );
  }
}
