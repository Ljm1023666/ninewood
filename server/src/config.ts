import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[Ninewood] FATAL: JWT_SECRET 环境变量未设置，拒绝启动');
      process.exit(1);
    }
    console.warn('[Ninewood] 警告: JWT_SECRET 未设置，使用开发默认值（严禁用于生产环境）');
    return 'dev-secret-do-not-use-in-prod';
  })(),
  jwtExpiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  uploadDir: path.join(__dirname, '..', 'uploads'),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'app://.'],

  // MiniMax / DeepSeek / Qwen（OpenAI 兼容接口）
  aiProvider: (process.env.AI_PROVIDER || 'minimax') as 'minimax' | 'deepseek' | 'qwen',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.minimaxi.com/v1',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'MiniMax-M2.5',
  aiThinkModel: process.env.AI_THINK_MODEL || '',
  aiFastModel: process.env.AI_FAST_MODEL || '',

  // 多提供商配置（平台兜底 Key + 默认模型）
  providers: {
    minimax: {
      baseUrl: process.env.AI_BASE_URL || 'https://api.minimaxi.com/v1',
      apiKey: process.env.AI_API_KEY || '',
      defaultModel: process.env.AI_MODEL || 'MiniMax-M2.5',
      thinkModel: process.env.AI_THINK_MODEL || process.env.AI_MODEL || 'MiniMax-M2.5',
      fastModel: process.env.AI_FAST_MODEL || process.env.AI_MODEL || 'MiniMax-M2.5',
    },
    deepseek: {
      baseUrl: process.env.DS_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.DS_API_KEY || '',
      defaultModel: process.env.DS_MODEL || 'deepseek-chat',
      thinkModel: process.env.DS_THINK_MODEL || 'deepseek-v4-pro',
      fastModel: process.env.DS_FAST_MODEL || 'deepseek-v4-flash',
    },
    qwen: {
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: process.env.QWEN_API_KEY || '',
      defaultModel: process.env.QWEN_MODEL || 'qwen3.7-plus',
      thinkModel: process.env.QWEN_THINK_MODEL || 'qwen3.7-plus',
      fastModel: process.env.QWEN_FAST_MODEL || 'qwen3.7-plus',
    },
  },

  // 平台托管 Key 配额（用户未 BYOK 时生效）
  platformQuota: {
    dailyLimit: parseInt(process.env.AI_PLATFORM_DAILY_LIMIT || '150', 10),
    hourlyLimit: parseInt(process.env.AI_PLATFORM_HOURLY_LIMIT || '50', 10),
    sessionLimit: parseInt(process.env.AI_PLATFORM_SESSION_LIMIT || '250', 10),
  },
  byokRequired: process.env.AI_BYOK_REQUIRED === 'true',

  // hCaptcha 人机验证
  hcaptcha: {
    siteKey: process.env.HCAPTCHA_SITE_KEY || '',
    secretKey: process.env.HCAPTCHA_SECRET_KEY || '',
  },

  // Tencent Cloud SMS
  sms: {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    sdkAppId: process.env.TENCENT_SMS_APPID || '',
    signName: process.env.TENCENT_SMS_SIGN || '乌鲁木齐往昔科技有限公司',
    templateId: process.env.TENCENT_SMS_TEMPLATE || '2631789',
  },
};

export type LlmProviderId = 'minimax' | 'deepseek' | 'qwen';

export interface LlmCredentials {
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
}

/** 根据模型名解析 OpenAI 兼容端点与 Key（平台 .env；后续可注入用户 BYOK） */
export function resolveLlmCredentials(model?: string, userKey?: Partial<Record<LlmProviderId, string>>): LlmCredentials {
  const m = (model || '').toLowerCase();
  let provider: LlmProviderId = 'minimax';
  if (m.startsWith('deepseek')) provider = 'deepseek';
  else if (m.startsWith('qwen')) provider = 'qwen';
  else if (config.aiProvider === 'deepseek' || config.aiProvider === 'qwen') provider = config.aiProvider;

  const p = config.providers[provider];
  const apiKey = userKey?.[provider] || p.apiKey;
  return { provider, baseUrl: p.baseUrl, apiKey };
}

/** 列出已配置平台兜底 Key 的提供商（用于设置页展示） */
export function listConfiguredLlmProviders(): LlmProviderId[] {
  return (['minimax', 'deepseek', 'qwen'] as const).filter((id) => Boolean(config.providers[id].apiKey));
}

// ── 启动时环境检查 ──

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SENTRY_DSN) {
  console.warn('[Ninewood] 警告: 生产环境未设置 SENTRY_DSN，错误将不会被上报');
}

if (!config.aiApiKey && !config.providers.deepseek.apiKey && !config.providers.qwen.apiKey) {
  const msg = isProd
    ? '[Ninewood] 警告: 未配置任何平台 LLM API Key（AI_/DS_/QWEN_），AI 功能将不可用'
    : '[Ninewood] 提示: 未配置平台 LLM API Key，请编辑 server/.env 或见 docs/LLM-CONFIG.md';
  console.warn(msg);
} else if (!config.aiApiKey) {
  console.warn('[Ninewood] 提示: AI_API_KEY（MiniMax）未设置，默认路由仍可用 DeepSeek/Qwen 平台 Key');
}

if (isProd && !config.hcaptcha.secretKey) {
  console.warn('[Ninewood] 警告: 生产环境未设置 HCAPTCHA_SECRET_KEY，人机验证将不可用');
}

if (isProd && (!config.sms.secretId || !config.sms.secretKey)) {
  console.warn('[Ninewood] 警告: 生产环境未设置腾讯云 SMS 密钥，短信验证码将不可用');
}
