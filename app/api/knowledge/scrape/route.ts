import { NextRequest, NextResponse } from 'next/server';
import type { ScrapedPage } from '@/lib/knowledge-types';

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

// Fetch a single page
async function fetchPage(url: string, depth: number): Promise<ScrapedPage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentForge/1.0; +https://agentforge.ai)',
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
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

// POST: Scrape website
export async function POST(request: NextRequest) {
  try {
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
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape website' },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
