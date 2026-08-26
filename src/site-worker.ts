interface SiteAssets {
  fetch(request: Request): Promise<Response>;
}

interface SiteEnvironment {
  ASSETS: SiteAssets;
}

export default {
  async fetch(request: Request, environment: SiteEnvironment): Promise<Response> {
    let response = await environment.ASSETS.fetch(request);

    if (response.status === 404 && request.method === 'GET') {
      const accept = request.headers.get('accept') ?? '';
      if (accept.includes('text/html')) {
        const fallbackUrl = new URL('/index.html', request.url);
        response = await environment.ASSETS.fetch(new Request(fallbackUrl, request));
      }
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    const trustedOrigin = new URL(request.url).origin;
    const html = (await response.text()).replaceAll('https://estudea.invalid', trustedOrigin);
    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
