const API_BASE_URL = (
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{39,4096}$/.test(token)) {
    return new Response('Image not found', { status: 404 });
  }
  try {
    const upstream = await fetch(`${API_BASE_URL}/storage/product-images/${token}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      return new Response('Image unavailable', { status: upstream.status === 404 ? 404 : 502 });
    }
    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image unavailable', { status: 502 });
  }
}
