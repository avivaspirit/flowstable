// Redirect all .vercel.app traffic to .net (301 permanent)
// Prevents Google duplicate content indexing
export function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('vercel.app')) {
    url.hostname = 'flowstable.net';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return undefined;
}
