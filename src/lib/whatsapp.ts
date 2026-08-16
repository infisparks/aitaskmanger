import { WhatsAppSendResult } from "@/types";

const DEFAULT_API_KEY = "vR39h6avY69g7kAU3YQbS6V6XEvudson";
const DEFAULT_API_URL = "https://evo.infispark.in";
const DEFAULT_INSTANCE = "mudassir";

export function formatIndianPhoneNumber(phone: string): string {
  // Remove non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If starts with 0, remove it
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  
  // If already has 91 country code and 12 digits total
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned;
  }
  
  // If 10 digits (standard Indian mobile)
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // If 12 digits or more with country code
  return cleaned;
}

export function formatStaffWhatsAppMessage(
  staffName: string,
  tasks: Array<{ title: string; description?: string; priority?: string; dueDate?: string }>,
  dateStr?: string
): string {
  const today = dateStr || new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  let msg = `📋 *DAILY TASK ASSIGNMENT*\n`;
  msg += `👤 *Staff:* ${staffName}\n`;
  msg += `📅 *Date:* ${today}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

  tasks.forEach((task, index) => {
    const priorityIcon = 
      task.priority === 'urgent' ? '🔴 [URGENT]' :
      task.priority === 'high' ? '🟠 [HIGH]' :
      task.priority === 'medium' ? '🟡 [NORMAL]' : '🟢 [LOW]';

    msg += `*${index + 1}. ${task.title}*\n`;
    if (task.description) {
      msg += `   📝 _${task.description}_\n`;
    }
    if (task.priority) {
      msg += `   ⚡ *Priority:* ${priorityIcon}\n`;
    }
    if (task.dueDate) {
      msg += `   ⏰ *Due:* ${task.dueDate}\n`;
    }
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_Please review your tasks and update status once completed. Have a productive day!_ 🚀`;

  return msg;
}

/**
 * Direct Client-Side WhatsApp Message Dispatcher
 * Calls the Evolution API directly from the browser without server route dependencies.
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppSendResult> {
  const formattedNumber = formatIndianPhoneNumber(phoneNumber);
  const apiKey = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || DEFAULT_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || DEFAULT_API_URL;
  const instance = process.env.NEXT_PUBLIC_WHATSAPP_INSTANCE || DEFAULT_INSTANCE;

  const targetUrl = `${baseUrl.replace(/\/+$/, "")}/message/${instance}`;

  const whatsappPayload = {
    number: formattedNumber,
    text: message,
  };

  console.log(`[Client WhatsApp Dispatch] Sending to ${targetUrl} for ${formattedNumber}...`);

  try {
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
      console.error("[Client WhatsApp Error]", response.status, responseData);
      return {
        success: false,
        error: `WhatsApp API error (${response.status}): ${typeof responseData === 'object' ? JSON.stringify(responseData) : responseText}`,
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    console.error("[Client WhatsApp Network Error]:", error);
    return {
      success: false,
      error: error.message || "Failed to connect to WhatsApp Evolution API.",
    };
  }
}

/**
 * Direct WhatsApp Web / App link generator as a 1-tap fallback
 */
export function openWhatsAppDirectLink(phoneNumber: string, message: string) {
  const formattedNumber = formatIndianPhoneNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${formattedNumber}&text=${encodedText}`;
  window.open(url, "_blank");
}
