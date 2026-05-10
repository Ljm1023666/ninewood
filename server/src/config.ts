import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
  jwtExpiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
  uploadDir: path.join(__dirname, '..', 'uploads'),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'app://.'],

  // Tencent Cloud SMS
  sms: {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    sdkAppId: process.env.TENCENT_SMS_APPID || '',
    signName: process.env.TENCENT_SMS_SIGN || '乌鲁木齐往昔科技有限公司',
    templateId: process.env.TENCENT_SMS_TEMPLATE || '2631789',
  },
};
