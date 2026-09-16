import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = '업무보드';

// ID | 프로젝트ID | 제목 | 설명 | 유형 | 상태 | 우선순위 | 시작일 | 목표일 | 메모

export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return NextResponse.json([]);
    const headers = rows[0];
    const data = rows.slice(1)
      .filter(row => row[0])
      .map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          body.ID, body.프로젝트ID || '', body.제목, body.설명 || '',
          body.유형, body.상태 || '', body.우선순위 || '',
          body.시작일 || '', body.목표일 || '', body.메모 || ''
        ]],
      },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(body.ID));
    if (rowIndex === -1) return NextResponse.json({ error: '항목 없음' }, { status: 404 });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:J${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          body.ID, body.프로젝트ID || '', body.제목, body.설명 || '',
          body.유형, body.상태 || '', body.우선순위 || '',
          body.시작일 || '', body.목표일 || '', body.메모 || ''
        ]],
      },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { ID } = await req.json();
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:J`,
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === String(ID));
    if (rowIndex === -1) return NextResponse.json({ error: '항목 없음' }, { status: 404 });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:J${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['', '', '', '', '', '', '', '', '', '']] },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
