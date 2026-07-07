import FormData from 'form-data';

export default async function handler(req, res) {
  // Fixes browser cross-domain security blocks natively
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1. Capture the raw binary chunk buffers directly from your web tab request
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers);

    // 2. Parse out the multi-part boundary string to isolate the image file stream
    const contentType = req.headers['content-type'] || req.headers['Content-Type'];
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return res.status(400).send('Invalid multipart request.');
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    // Find and isolate raw file data within the multipart boundaries
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const startIdx = rawBody.indexOf(boundaryBuffer);
    const endIdx = rawBody.indexOf(boundaryBuffer, startIdx + boundaryBuffer.length);
    
    if (startIdx === -1 || endIdx === -1) {
      return res.status(400).send('Empty file payload data.');
    }

    const fileBlock = rawBody.subarray(startIdx, endIdx);
    const headerEndIdx = fileBlock.indexOf('\r\n\r\n');
    if (headerEndIdx === -1) return res.status(400).send('Malformed payload data.');
    
    // Extract the pure, unpolluted file buffer
    const pureFileBuffer = fileBlock.subarray(headerEndIdx + 4, fileBlock.length - 2);

    // 3. Re-assemble standard multi-part payload package for remove.bg
    const apiForm = new FormData();
    apiForm.append('size', 'auto');
    apiForm.append('image_file', pureFileBuffer, {
      filename: 'canvas_source.png',
      contentType: 'image/png',
    });

    // 4. Dispatch directly to the verified remove.bg REST endpoint
    const response = await fetch('https://remove.bg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.API_KEY,
        ...apiForm.getHeaders(),
      },
      body: apiForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove.bg Failure response:', errorText);
      return res.status(response.status).send(`API Error: ${response.statusText}`);
    }

    // 5. Stream transparent image byte matrix right back onto your monitor
    const arrayBuffer = await response.arrayBuffer();
    const finalBuffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(finalBuffer);

  } catch (err) {
    console.error('Crash Event Intercepted:', err.message);
    return res.status(500).send('Server Processing Error: ' + err.message);
  }
}
