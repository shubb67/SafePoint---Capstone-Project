import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { createReadStream } from 'fs';

const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('audio');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No audio file uploaded' }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = uuidv4();
    const filePath = path.join(tmpdir(), `${fileId}.webm`);

    await writeFile(filePath, buffer);
 
    // Step 1: Upload file to AssemblyAI
    const uploadRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        authorization: ASSEMBLY_API_KEY,
        'Transfer-Encoding': 'chunked',
      },
      data: createReadStream(filePath),
    });

    const uploadUrl = uploadRes.data.upload_url;

    // Step 2: Start transcription
    const transcriptRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: {
        authorization: ASSEMBLY_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        audio_url: uploadUrl,
      },
    });

    const transcriptId = transcriptRes.data.id;

    // Step 3: Poll until transcription is complete
    let completed = false;
    let transcriptText = '';
    let retries = 0;

    while (!completed && retries < 20) {
      await new Promise((r) => setTimeout(r, 3000)); // wait 3 seconds
      const pollRes = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          authorization: ASSEMBLY_API_KEY,
        },
      });

      if (pollRes.data.status === 'completed') {
        completed = true;
        transcriptText = pollRes.data.text;
      } else if (pollRes.data.status === 'error') {
        throw new Error(pollRes.data.error);
      }

      retries++;
    }

    await unlink(filePath);

    return new Response(JSON.stringify({ transcription: transcriptText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AssemblyAI error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Transcription failed' }), {
      status: 500,
    });
  }
}