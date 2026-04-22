import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import type { ScrapedPage } from '@/lib/knowledge-types';

// SSRF protection: block private/reserved IP ranges
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // loopback
  /^10\./,                     // private class A
  /^172\.(1[6-9]|2\d|3[01])\./, // private class B
  /^192\.168\./,               // private class C
  /^169\.254\./,               // link-local / cloud metadata
  /^0\./,                      // current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // carrier-grade NAT
  /^::1$/,                     // IPv6 loopback
  /^fc00:/i,                   // IPv6 unique local
  /^fe80:/i,                   // IPv6 link-local
];

function isBlockedUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '[::1]') return true;

  // Block IP addresses in private ranges
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) return true;
  }

  // Block non-HTTP(S) schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;

  return false;
}

async function requireAuth() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Simple HTML to text extraction
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Extract title from HTML
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

// Extract links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      // Skip anchors, javascript, mailto, etc.
      if (href.startsWith('#') || href.startsWith('javascript:') || 
          href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      // Resolve relative URLs
      const absoluteUrl = new URL(href, baseUrl).href;
      
      // Only include URLs from the same domain
      const base = new URL(baseUrl);
      const link = new URL(absoluteUrl);
      if (link.hostname === base.hostname) {
        links.push(absoluteUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  return Array.from(new Set(links)); // Remove duplicates
}

// Fetch a single page (with SSRF protection)
async function fetchPage(url: string, depth: number): Promise<ScrapedPage | null> {
  try {
    // SSRF protection: validate URL before fetching
    const parsedUrl = new URL(url);
    if (isBlockedUrl(parsedUrl)) {
      logger.warn('Blocked SSRF attempt', { url });
      return null;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentForge/1.0; +https://agent-forge.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }
    
    const html = await response.text();
    const title = extractTitle(html);
    const content = extractTextFromHtml(html);
    const links = extractLinks(html, url);
    
    // Skip pages with very little content
    if (content.length < 100) {
      return null;
    }
    
    return {
      url,
      title: title || url,
      content,
      depth,
      links,
      selected: true,
    };
  } catch (error) {
    logger.error('Failed to fetch page', error, { url });
    return null;
  }
}

// POST: Scrape website
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { url, depth = 1, maxPages = 10, includePaths, excludePaths } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let baseUrl: URL;
    try {
      baseUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // SSRF protection: block private/internal URLs
    if (isBlockedUrl(baseUrl)) {
      return NextResponse.json(
        { error: 'URL not allowed: private or internal addresses are blocked' },
        { status: 403 }
      );
    }
    
    const pages: ScrapedPage[] = [];
    const visited = new Set<string>();
    const queue: { url: string; depth: number }[] = [{ url: baseUrl.href, depth: 0 }];
    
    while (queue.length > 0 && pages.length < maxPages) {
      const item = queue.shift()!;
      
      // Skip if already visited
      if (visited.has(item.url)) continue;
      visited.add(item.url);
      
      // Skip if depth exceeded
      if (item.depth > depth) continue;
      
      // Check include/exclude paths
      if (includePaths && includePaths.length > 0) {
        const matchesInclude = includePaths.some((p: string) => item.url.includes(p));
        if (!matchesInclude) continue;
      }
      
      if (excludePaths && excludePaths.length > 0) {
        const matchesExclude = excludePaths.some((p: string) => item.url.includes(p));
        if (matchesExclude) continue;
      }
      
      // Fetch the page
      const page = await fetchPage(item.url, item.depth);
      
      if (page) {
        pages.push(page);
        
        // Add child links to queue if not at max depth
        if (item.depth < depth) {
          for (const link of page.links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      pages,
      totalFound: visited.size,
      scraped: pages.length,
    });
    
  } catch (error) {
    logger.error('Website scrape error', error);
    return NextResponse.json(
      { error: 'Failed to scrape website' },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS() {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://agent-forge.app';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
