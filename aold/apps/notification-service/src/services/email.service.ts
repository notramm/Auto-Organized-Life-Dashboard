// apps/notification-service/src/services/email.service.ts

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';

const ses = new SESClient({
  region:      config.AWS_REGION,
  credentials: {
    accessKeyId:     config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export interface EmailPayload {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  // In dev — just log, don't actually send
  if (config.NODE_ENV === 'development') {
    console.info(`[Email DEV] To: ${payload.to} | Subject: ${payload.subject}`);
    return;
  }

  await ses.send(new SendEmailCommand({
    Source:      `${config.SES_FROM_NAME} <${config.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [payload.to] },
    Message: {
      Subject: { Data: payload.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: payload.html, Charset: 'UTF-8' },
        ...(payload.text && { Text: { Data: payload.text, Charset: 'UTF-8' } }),
      },
    },
  }));
}

// ── Email templates ───────────────────────────────────────────────
export function buildFileProcessedEmail(params: {
  userName:  string;
  fileName:  string;
  fileType:  string;
  tags:      string[];
  dashboardUrl: string;
}): EmailPayload {
  const { userName, fileName, fileType, tags, dashboardUrl } = params;
  const tagList = tags.slice(0, 5).map((t) => t.replace('ai:', '')).join(', ');

  return {
    to:      '',  // set by caller
    subject: `✅ "${fileName}" has been processed`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#080C14;border-radius:16px;padding:32px;color:#CBD5E1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:28px;height:28px;background:#F59E0B;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="color:#080C14;font-weight:bold;font-size:14px">⚡</span>
            </div>
            <span style="font-weight:700;font-size:16px;color:#F1F5F9">AOLD</span>
          </div>
          <h2 style="color:#F1F5F9;margin:0 0 8px">File Ready!</h2>
          <p style="color:#94A3B8;margin:0 0 20px">Hi ${userName}, your file has been processed by AI.</p>
          <div style="background:#111B2E;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #1C2D47">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F1F5F9">${fileName}</p>
            <p style="margin:0 0 8px;font-size:12px;color:#64748B">${fileType.toLowerCase()}</p>
            ${tagList ? `<div style="display:flex;flex-wrap:wrap;gap:4px">${tags.slice(0,5).map((t) => `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#F59E0B1A;color:#F59E0B;border:1px solid #F59E0B33">${t.replace('ai:','')}</span>`).join('')}</div>` : ''}
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;background:#F59E0B;color:#080C14;font-weight:600;font-size:14px;padding:10px 20px;border-radius:10px;text-decoration:none">
            View in Dashboard →
          </a>
        </div>
      </div>
    `,
    text: `Hi ${userName}, your file "${fileName}" has been processed. Tags: ${tagList}. View it at: ${dashboardUrl}`,
  };
}

export function buildDailyDigestEmail(params: {
  userName:    string;
  description: string;
  dashboardUrl: string;
}): EmailPayload {
  const { userName, description, dashboardUrl } = params;
  return {
    to:      '',
    subject: `📊 Your AOLD Daily Summary`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#080C14;border-radius:16px;padding:32px;color:#CBD5E1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:28px;height:28px;background:#F59E0B;border-radius:8px;text-align:center;line-height:28px">⚡</div>
            <span style="font-weight:700;color:#F1F5F9">AOLD</span>
          </div>
          <h2 style="color:#F1F5F9;margin:0 0 8px">Daily Summary</h2>
          <p style="color:#94A3B8;margin:0 0 20px">Hi ${userName},</p>
          <div style="background:#111B2E;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid #1C2D47">
            <p style="margin:0;font-size:14px;color:#CBD5E1;line-height:1.6">${description}</p>
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;background:#F59E0B;color:#080C14;font-weight:600;font-size:14px;padding:10px 20px;border-radius:10px;text-decoration:none">
            Open Dashboard →
          </a>
        </div>
      </div>
    `,
    text: `Hi ${userName}, ${description}. Open: ${dashboardUrl}`,
  };
}