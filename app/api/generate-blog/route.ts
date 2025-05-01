// app/api/generate-blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const LANGFLOW_API = 'https://api.langflow.astra.datastax.com';
const APPLICATION_TOKEN = 'AstraCS:WTnpprXjYzDPrdmozMYPmXFv:641bb9d635c515d1e4e33c3f05d67e95ee35b6d3c25b5cfc1ff0b37221ee0aea';
const LANGFLOW_TIMEOUT = 90000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, country, audience, keywords, urls, userId, plan } = body;

    if (!topic || !country || !audience || !keywords || !urls || !userId || !plan) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Fetch user document
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    let userData = userSnap.exists() ? userSnap.data() : {};
    const publishedBlogs = userData.publishedBlogs || 0;
    const aiBlogs = userData.aiBlogs || 0;

    // Enforce medium plan limits
    if (plan === 'medium') {
      if (publishedBlogs >= 5 || aiBlogs >= 3) {
        return NextResponse.json({ error: 'limit_reached' }, { status: 403 });
      }
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

    const response = await axios.post(
      `${LANGFLOW_API}/lf/90f26dad-f91c-4f96-b632-9a7b2ccafa2f/api/v1/run/328c3738-c19d-411f-b9f0-d011450221f3`,
      payload,
      {
        timeout: LANGFLOW_TIMEOUT,
        headers: {
          'Authorization': `Bearer ${APPLICATION_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    const blogContent = response.data?.outputs?.[0]?.outputs?.[0]?.artifacts?.message;

    if (!blogContent) {
      console.error('Blog content path:', JSON.stringify(response.data, null, 2));
      throw new Error('Blog content not found in response structure');
    }

    // Update user document: increment aiBlogs and publishedBlogs
    await updateDoc(userRef, {
      aiBlogs: aiBlogs + 1,
      publishedBlogs: publishedBlogs + 1
    });

    return NextResponse.json({ blog: blogContent });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({
      error: error.message.includes('structure')
        ? 'Unexpected response format from AI service'
        : 'Blog generation failed'
    }, { status: 500 });
  }
}
