import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const PYTHON_API = 'http://localhost:5001/analyze';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward the request to the Python backend
    const response = await axios.post(PYTHON_API, body, {
      headers: { 'Content-Type': 'application/json' },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to connect to Python API' },
      { status: 500 }
    );
  }
}