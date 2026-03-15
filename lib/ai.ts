import { z } from "zod";
import { buildSystemPrompt, buildVisionPrompt, validateParsedLog } from "@/lib/parsing";
import { ParsedChatLog } from "@/lib/types";

type Provider = "deepseek" | "qwen" | "openai";

interface ProviderConfig {
  provider: Provider;
  apiKey?: string;
  endpoint: string;
  model: string;
  supportsImages: boolean;
  mode: "json_object" | "json_schema";
}

function getTextProvider(): Provider {
  return (process.env.AI_TEXT_PROVIDER as Provider) || "deepseek";
}

function getVisionProvider(): Provider {
  return (process.env.AI_VISION_PROVIDER as Provider) || "qwen";
}

function getProviderConfig(provider: Provider, useVision: boolean): ProviderConfig {
  if (provider === "deepseek") {
    return {
      provider,
      apiKey: process.env.DEEPSEEK_API_KEY,
      endpoint: `${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      supportsImages: false,
      mode: "json_object"
    };
  }

  if (provider === "qwen") {
    const baseUrl =
      process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

    return {
      provider,
      apiKey: process.env.QWEN_API_KEY,
      endpoint: `${baseUrl}/chat/completions`,
      model: useVision
        ? process.env.QWEN_VISION_MODEL || "qwen3.5-flash"
        : process.env.QWEN_TEXT_MODEL || "qwen-plus",
      supportsImages: true,
      mode: "json_schema"
    };
  }

  return {
    provider,
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
    model: useVision
      ? process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini"
      : process.env.OPENAI_MODEL || "gpt-4.1-mini",
    supportsImages: true,
    mode: "json_schema"
  };
}

function buildJsonSchema() {
  return {
    name: "baby_log_parse",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: {
          type: "string",
          enum: ["intake", "sleep", "note"]
        },
        occurredAt: { type: "string" },
        intakeType: {
          type: "string",
          enum: ["formula", "solid_food", "water", "snack"]
        },
        amountMl: { type: "integer" },
        amountG: { type: "integer" },
        sleepStartAt: { type: "string" },
        sleepEndAt: { type: "string" },
        noteCategory: {
          type: "string",
          enum: ["condition", "symptom", "general"]
        },
        note: { type: "string" },
        confidence: { type: "number" },
        followUpQuestion: { type: "string" }
      },
      required: ["type", "confidence"]
    }
  };
}

const batchSchema = z.object({
  entries: z.array(
    z.object({
      type: z.enum(["intake", "sleep", "note"]),
      occurredAt: z.string().optional(),
      intakeType: z.enum(["formula", "solid_food", "water", "snack"]).optional(),
      amountMl: z.number().int().positive().optional(),
      amountG: z.number().int().positive().optional(),
      sleepStartAt: z.string().optional(),
      sleepEndAt: z.string().optional(),
      noteCategory: z.enum(["condition", "symptom", "general"]).optional(),
      note: z.string().optional(),
      confidence: z.number().min(0).max(1),
      followUpQuestion: z.string().optional()
    })
  )
});

function buildBatchJsonSchema() {
  return {
    name: "baby_log_batch_parse",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        entries: {
          type: "array",
          items: buildJsonSchema().schema
        }
      },
      required: ["entries"]
    }
  };
}

function extractContentText(data: any) {
  return data?.choices?.[0]?.message?.content;
}

async function createCompletion(input: {
  provider: Provider;
  systemPrompt: string;
  userText?: string;
  imageDataUrl?: string;
}) {
  const config = getProviderConfig(input.provider, Boolean(input.imageDataUrl));

  if (!config.apiKey) {
    return null;
  }

  if (input.imageDataUrl && !config.supportsImages) {
    return null;
  }

  const messages =
    input.imageDataUrl && config.supportsImages
      ? [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: input.imageDataUrl
                }
              },
              {
                type: "text",
                text: input.userText || "이미지 속 육아 기록을 구조화해줘."
              }
            ]
          }
        ]
      : [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: input.userText
          }
        ];

  const body =
    config.mode === "json_schema"
      ? {
          model: config.model,
          messages,
          temperature: 0.1,
          response_format: {
            type: "json_schema",
            json_schema: buildJsonSchema()
          }
        }
      : {
          model: config.model,
          messages,
          temperature: 0.1,
          response_format: {
            type: "json_object"
          }
        };

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${config.provider} parse failed: ${response.status}`);
  }

  const data = await response.json();
  const content = extractContentText(data);

  if (typeof content !== "string") {
    throw new Error(`${config.provider} response content is empty`);
  }

  return validateParsedLog(JSON.parse(content));
}

export async function parseTextWithAI(input: {
  text: string;
  nowIso: string;
}): Promise<ParsedChatLog | null> {
  return createCompletion({
    provider: getTextProvider(),
    systemPrompt: `${buildSystemPrompt(input.nowIso)}\n반드시 JSON으로만 답해.`,
    userText: input.text
  });
}

export async function parseImageWithAI(input: {
  caption?: string;
  nowIso: string;
  imageDataUrl: string;
}): Promise<ParsedChatLog | null> {
  return createCompletion({
    provider: getVisionProvider(),
    systemPrompt: `${buildVisionPrompt(input.nowIso)}\n반드시 JSON으로만 답해.`,
    userText: input.caption?.trim() || "사진 속 기록을 읽고 구조화해줘.",
    imageDataUrl: input.imageDataUrl
  });
}

export async function parseImageBatchWithAI(input: {
  caption?: string;
  nowIso: string;
  imageDataUrl: string;
}): Promise<ParsedChatLog[] | null> {
  const provider = getVisionProvider();
  const config = getProviderConfig(provider, true);

  if (!config.apiKey || !config.supportsImages) {
    return null;
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `${buildVisionPrompt(input.nowIso)}
사진 안에 여러 줄의 기록이 있으면 최대 5건까지 entries 배열로 반환하라.
읽을 수 없는 항목은 제외하라.
반드시 JSON으로만 답해.`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: input.imageDataUrl
              }
            },
            {
              type: "text",
              text: input.caption?.trim() || "이미지의 여러 기록을 배열로 구조화해줘."
            }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: buildBatchJsonSchema()
      }
    })
  });

  if (!response.ok) {
    throw new Error(`${provider} batch image parse failed: ${response.status}`);
  }

  const data = await response.json();
  const content = extractContentText(data);

  if (typeof content !== "string") {
    throw new Error(`${provider} batch response content is empty`);
  }

  const parsed = batchSchema.parse(JSON.parse(content));
  return parsed.entries.map((entry) => validateParsedLog(entry));
}
