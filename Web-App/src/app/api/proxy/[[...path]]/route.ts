import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://129.80.144.145:3001';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

async function proxyRequest(request: NextRequest, pathSegments: string[], method: string) {
  const path = pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/${path}${searchParams ? '?' + searchParams : ''}`;

  // Forward headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Handle body for non-GET requests
  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        body = JSON.stringify(await request.json());
      } catch {
        body = await request.text();
      }
    } else {
      body = await request.text();
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      // Allow insecure HTTP in server-side fetch (Vercel → VM)
      // Next.js fetch doesn't have agent option, but we use direct HTTP
    });

    const responseBody = await response.text();

    // Forward response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip headers that Next.js will set
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy Error] ${method} ${targetUrl}:`, error);
    return NextResponse.json(
      { success: false, error: 'Backend unreachable', details: (error as Error).message },
      { status: 502 }
    );
  }
}
