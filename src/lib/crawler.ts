import * as cheerio from 'cheerio';

export interface CrawledSiteData {
  reachable: boolean;
  finalUrl: string;
  responseTimeMs: number;
  sslValid: boolean;
  title: string;
  metaDescription: string;
  hasMobileViewport: boolean;
  hasBookingCta: boolean;
  hasWhatsappWidget: boolean;
  techStack: string[];
  emails: string[];
  phones: string[];
  whatsappLinks: string[];
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  bodyTextSnippet: string;
  error?: string;
}

export function normalizeDomain(urlOrDomain: string): string {
  if (!urlOrDomain) return '';
  try {
    const withProto = /^https?:\/\//i.test(urlOrDomain)
      ? urlOrDomain.trim()
      : `https://${urlOrDomain.trim()}`;
    const u = new URL(withProto);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlOrDomain
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }
}

export function ensureHttpUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function detectTechStack(html: string, headers: Headers): string[] {
  const stack = new Set<string>();
  const lower = html.toLowerCase();
  const server = (headers.get('server') || '').toLowerCase();
  const poweredBy = (headers.get('x-powered-by') || '').toLowerCase();

  if (lower.includes('wp-content') || lower.includes('wp-includes')) stack.add('WordPress');
  if (lower.includes('cdn.shopify.com') || lower.includes('shopify')) stack.add('Shopify');
  if (lower.includes('wixstatic.com') || lower.includes('wix.com')) stack.add('Wix');
  if (lower.includes('webflow')) stack.add('Webflow');
  if (lower.includes('squarespace')) stack.add('Squarespace');
  if (lower.includes('__next_data__') || lower.includes('/_next/')) stack.add('Next.js');
  if (lower.includes('react') || lower.includes('data-reactroot')) stack.add('React');
  if (lower.includes('laravel') || headers.get('set-cookie')?.includes('laravel_session'))
    stack.add('Laravel');
  if (poweredBy.includes('php') || lower.includes('.php')) stack.add('PHP');
  if (lower.includes('woocommerce')) stack.add('WooCommerce');
  if (lower.includes('bootstrap')) stack.add('Bootstrap');
  if (lower.includes('tailwind')) stack.add('Tailwind CSS');
  if (lower.includes('razorpay')) stack.add('Razorpay');
  if (lower.includes('stripe.com') || lower.includes('js.stripe')) stack.add('Stripe');
  if (lower.includes('gtag(') || lower.includes('googletagmanager')) stack.add('Google Analytics');
  if (server.includes('cloudflare')) stack.add('Cloudflare');

  return Array.from(stack);
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

const IGNORED_EMAIL_SUFFIXES = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.css', '.js'];

function extractFromHtml(html: string, headers: Headers, finalUrl: string, responseTimeMs: number): CrawledSiteData {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const hasMobileViewport = viewport.toLowerCase().includes('width=device-width');

  const emails = new Set<string>();
  const phones = new Set<string>();
  const whatsappLinks = new Set<string>();
  let linkedinUrl = '';
  let instagramUrl = '';
  let facebookUrl = '';
  let hasBookingCta = false;
  let hasWhatsappWidget = false;

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    const text = $(el).text().toLowerCase();
    const lowerHref = href.toLowerCase();

    if (lowerHref.startsWith('mailto:')) {
      const addr = href.slice(7).split('?')[0].trim().toLowerCase();
      if (addr.includes('@')) emails.add(addr);
    } else if (lowerHref.startsWith('tel:')) {
      const num = href.slice(4).trim();
      if (num.replace(/\D/g, '').length >= 8) phones.add(num);
    } else if (lowerHref.includes('wa.me/') || lowerHref.includes('api.whatsapp.com')) {
      whatsappLinks.add(href);
      hasWhatsappWidget = true;
    } else if (!linkedinUrl && lowerHref.includes('linkedin.com/')) {
      linkedinUrl = href;
    } else if (!instagramUrl && lowerHref.includes('instagram.com/')) {
      instagramUrl = href;
    } else if (!facebookUrl && lowerHref.includes('facebook.com/')) {
      facebookUrl = href;
    }

    if (
      text.includes('book') ||
      text.includes('appointment') ||
      text.includes('schedule') ||
      text.includes('reserve') ||
      lowerHref.includes('calendly.com') ||
      lowerHref.includes('cal.com') ||
      lowerHref.includes('book')
    ) {
      hasBookingCta = true;
    }
  });

  if ($('form').length > 0) {
    const formText = $('form').text().toLowerCase();
    if (formText.includes('book') || formText.includes('appointment') || formText.includes('date')) {
      hasBookingCta = true;
    }
  }

  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  const textEmails = bodyText.match(EMAIL_REGEX) || [];
  for (const e of textEmails) {
    const clean = e.toLowerCase();
    if (
      !IGNORED_EMAIL_SUFFIXES.some((s) => clean.endsWith(s)) &&
      !clean.includes('example.com') &&
      !clean.includes('sentry.io')
    ) {
      emails.add(clean);
    }
  }

  if (phones.size === 0) {
    const textPhones = bodyText.match(PHONE_REGEX) || [];
    for (const p of textPhones.slice(0, 3)) {
      const digits = p.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 14) {
        phones.add(p.trim());
      }
    }
  }

  if (!hasWhatsappWidget && html.toLowerCase().includes('whatsapp')) {
    hasWhatsappWidget = true;
  }

  return {
    reachable: true,
    finalUrl,
    responseTimeMs,
    sslValid: finalUrl.startsWith('https://'),
    title,
    metaDescription,
    hasMobileViewport,
    hasBookingCta,
    hasWhatsappWidget,
    techStack: detectTechStack(html, headers),
    emails: Array.from(emails).slice(0, 5),
    phones: Array.from(phones).slice(0, 4),
    whatsappLinks: Array.from(whatsappLinks),
    linkedinUrl,
    instagramUrl,
    facebookUrl,
    bodyTextSnippet: bodyText.slice(0, 2200),
  };
}

/**
 * Crawls homepage (and optionally /contact if no email found) for free contact & technical inspection.
 */
export async function crawlWebsite(rawUrl: string): Promise<CrawledSiteData> {
  const targetUrl = ensureHttpUrl(rawUrl);
  if (!targetUrl) {
    return {
      reachable: false,
      finalUrl: '',
      responseTimeMs: 0,
      sslValid: false,
      title: '',
      metaDescription: '',
      hasMobileViewport: false,
      hasBookingCta: false,
      hasWhatsappWidget: false,
      techStack: [],
      emails: [],
      phones: [],
      whatsappLinks: [],
      linkedinUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      bodyTextSnippet: '',
      error: 'No website URL provided',
    };
  }

  const start = Date.now();
  try {
    const res = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(9000),
    });

    const elapsed = Date.now() - start;
    if (!res.ok) {
      return {
        reachable: false,
        finalUrl: res.url || targetUrl,
        responseTimeMs: elapsed,
        sslValid: (res.url || targetUrl).startsWith('https://'),
        title: '',
        metaDescription: '',
        hasMobileViewport: false,
        hasBookingCta: false,
        hasWhatsappWidget: false,
        techStack: [],
        emails: [],
        phones: [],
        whatsappLinks: [],
        linkedinUrl: '',
        instagramUrl: '',
        facebookUrl: '',
        bodyTextSnippet: '',
        error: `Website returned HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    const primary = extractFromHtml(html, res.headers, res.url || targetUrl, elapsed);

    // Try /contact fallback if no email found on homepage
    if (primary.emails.length === 0) {
      try {
        const origin = new URL(primary.finalUrl).origin;
        const contactRes = await fetch(`${origin}/contact`, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LeadOrbitAudit/1.0)',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (contactRes.ok) {
          const cHtml = await contactRes.text();
          const cData = extractFromHtml(cHtml, contactRes.headers, contactRes.url, elapsed);
          primary.emails = Array.from(new Set([...primary.emails, ...cData.emails])).slice(0, 5);
          primary.phones = Array.from(new Set([...primary.phones, ...cData.phones])).slice(0, 4);
          if (!primary.linkedinUrl && cData.linkedinUrl) primary.linkedinUrl = cData.linkedinUrl;
          if (!primary.instagramUrl && cData.instagramUrl) primary.instagramUrl = cData.instagramUrl;
        }
      } catch {
        // Ignore contact subpage failure
      }
    }

    return primary;
  } catch (err) {
    return {
      reachable: false,
      finalUrl: targetUrl,
      responseTimeMs: Date.now() - start,
      sslValid: targetUrl.startsWith('https://'),
      title: '',
      metaDescription: '',
      hasMobileViewport: false,
      hasBookingCta: false,
      hasWhatsappWidget: false,
      techStack: [],
      emails: [],
      phones: [],
      whatsappLinks: [],
      linkedinUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      bodyTextSnippet: '',
      error: err instanceof Error ? err.message : 'Failed to reach website',
    };
  }
}

