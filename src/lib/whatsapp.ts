import { WhatsAppSendResult } from "@/types";

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

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WhatsAppSendResult> {
  try {
    const formattedNumber = formatIndianPhoneNumber(phoneNumber);

    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: formattedNumber,
        message,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Failed to send WhatsApp message via proxy:", error);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp notification",
    };
  }
}
