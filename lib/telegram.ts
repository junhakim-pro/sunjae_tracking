const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file";

function getTelegramToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN이 없습니다.");
  }

  return token;
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const token = getTelegramToken();

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}

export async function getTelegramFileDataUrl(fileId: string) {
  const token = getTelegramToken();
  const fileInfoResponse = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${fileId}`);

  if (!fileInfoResponse.ok) {
    throw new Error(`Telegram getFile failed: ${fileInfoResponse.status}`);
  }

  const fileInfo = await fileInfoResponse.json();
  const filePath = fileInfo?.result?.file_path;

  if (!filePath) {
    throw new Error("Telegram file_path를 찾지 못했습니다.");
  }

  const fileResponse = await fetch(`${TELEGRAM_FILE_BASE}/bot${token}/${filePath}`);

  if (!fileResponse.ok) {
    throw new Error(`Telegram file download failed: ${fileResponse.status}`);
  }

  const contentType = fileResponse.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await fileResponse.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export function resolveTelegramCaregiver(from?: {
  id?: number;
  first_name?: string;
  username?: string;
}) {
  const raw = process.env.TELEGRAM_CAREGIVER_MAP_JSON;

  if (!raw) {
    return from?.first_name || from?.username || "텔레그램 사용자";
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;

    if (from?.id && parsed[String(from.id)]) {
      return parsed[String(from.id)];
    }

    if (from?.username && parsed[from.username]) {
      return parsed[from.username];
    }
  } catch (error) {
    console.error("TELEGRAM_CAREGIVER_MAP_JSON parse failed", error);
  }

  return from?.first_name || from?.username || "텔레그램 사용자";
}
