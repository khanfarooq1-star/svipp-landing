import { Buffer } from 'node:buffer';
import mammoth from 'npm:mammoth@1.8.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

function parseFailed(detail: string): Response {
  return jsonResponse(422, { error: 'CV_PARSE_FAILED', detail });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { b64, mediaType } = await req.json();

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch (_e) {
      console.error('parse-cv: invalid base64 input');
      return parseFailed('invalid_base64');
    }
    console.log(`parse-cv: mediaType=${mediaType} decodedBytes=${bytes.length}`);

    const prompt = 'Extract CV info. Reply ONLY valid JSON no other text: {"name":"","phone":"","email":"","location":"","experience":[{"title":"","employer":"","from":"","to":"","desc":"max 20 words"}],"education":[{"degree":"","school":"","from":"","to":""}],"skills":"","languages":""}';

    let content;
    if (mediaType === 'application/pdf') {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
        { type: 'text', text: prompt }
      ];
    } else if (mediaType === DOCX_TYPE) {
      let text = '';
      try {
        const extracted = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
        text = (extracted.value || '').trim();
      } catch (e) {
        console.error(`parse-cv: docx extraction failed: ${e.message}`);
        return parseFailed('docx_extraction_failed');
      }
      if (text.length < 50) {
        console.error(`parse-cv: docx extraction too short (${text.length} chars)`);
        return parseFailed('empty_extraction');
      }
      content = [
        { type: 'text', text: `CV text:\n\n${text}` },
        { type: 'text', text: prompt }
      ];
    } else if (IMAGE_TYPES.includes(mediaType)) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
        { type: 'text', text: prompt }
      ];
    } else {
      console.error(`parse-cv: unsupported mediaType=${mediaType}`);
      return parseFailed('unsupported_media_type');
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('parse-cv: ANTHROPIC_API_KEY not set');
      return jsonResponse(500, { error: 'ANTHROPIC_API_KEY not set' });
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content }]
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error(`parse-cv: anthropic error status=${resp.status} message=${data?.error?.message}`);
      return parseFailed('upstream_error');
    }

    try {
      const txt = data.content?.[0]?.text || '';
      const match = txt.match(/\{[\s\S]*\}/);
      if (!match || match[0].replace(/\s/g, '') === '{}') {
        console.error('parse-cv: no usable JSON in model response');
        return parseFailed('empty_result');
      }
      return jsonResponse(200, { result: match[0] });
    } catch (e) {
      console.error(`parse-cv: response parsing failed: ${e.message}`);
      return parseFailed('response_parse_failed');
    }
  } catch (e) {
    console.error(`parse-cv: unhandled error: ${e.message}`);
    return parseFailed('unhandled_error');
  }
});
