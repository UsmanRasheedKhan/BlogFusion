import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const LANGFLOW_API = 'https://api.langflow.astra.datastax.com';
const APPLICATION_TOKEN = 'AstraCS:WTnpprXjYzDPrdmozMYPmXFv:641bb9d635c515d1e4e33c3f05d67e95ee35b6d3c25b5cfc1ff0b37221ee0aea';
const LANGFLOW_TIMEOUT = 90000;
const PORT = 5000;

const langflowClient = axios.create({
  baseURL: LANGFLOW_API,
  timeout: LANGFLOW_TIMEOUT,
  headers: {
    'Authorization': `Bearer ${APPLICATION_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, country, audience, keywords, urls } = req.body;

    if (!topic || !country || !audience || !keywords || !urls) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const payload = {
      input_value: `Generate blog about ${topic} for ${audience} in ${country}`,
      input_type: 'chat',
      output_type: 'chat',
      tweaks: {
        "Prompt-D7UlR": {
          "template": "Write a blog in proper blog format on {topic}. The {topic} must cover {details}. It should also must include the following {keywords}. To support blog use the information from {references}.",
          "topic": topic,
          "details": audience,
          "keywords": keywords,
          "references": urls
        }
      }
    };

    const response = await langflowClient.post(
      '/lf/90f26dad-f91c-4f96-b632-9a7b2ccafa2f/api/v1/run/328c3738-c19d-411f-b9f0-d011450221f3',
      payload
    );

    const blogContent = response.data?.outputs?.[0]?.outputs?.[0]?.artifacts?.message;

    if (!blogContent) {
      console.error('Blog content path:', JSON.stringify(response.data, null, 2));
      throw new Error('Blog content not found in response structure');
    }

    console.log('Parsed blog content:', blogContent.substring(0, 100) + '...');
    res.status(200).json({ blog: blogContent });

  } catch (error: any) {
    console.error('API Error:', error.message);
    res.status(500).json({
      error: error.message.includes('structure') ?
        'Unexpected response format from AI service' :
        'Blog generation failed'
    });
  }
}
