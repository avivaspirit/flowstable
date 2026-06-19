import { readFileSync } from 'fs';
import { join } from 'path';

export const config = {
  headers: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Content-Type': 'application/xml; charset=utf-8',
  },
};

export default function handler() {
  try {
    const xml = readFileSync(join(process.cwd(), 'sitemap.xml'), 'utf-8');
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('<?xml version="1.0"?><error>sitemap not found</error>', {
      status: 404,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}
