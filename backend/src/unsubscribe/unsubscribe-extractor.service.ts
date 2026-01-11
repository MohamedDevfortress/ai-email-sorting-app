import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface UnsubscribeLink {
  url: string;
  type: 'http' | 'mailto';
  text?: string;
}

@Injectable()
export class UnsubscribeExtractorService {
  /**
   * Extract unsubscribe links from email HTML content
   */
  extractUnsubscribeLinks(htmlContent: string, headers?: any): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = [];
    const $ = cheerio.load(htmlContent);

    // 1. Look for links with "unsubscribe" text
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().toLowerCase();
      
      if (href && (text.includes('unsubscribe') || text.includes('opt out') || text.includes('opt-out'))) {
        if (href.startsWith('http')) {
          links.push({
            url: href,
            type: 'http',
            text: $(element).text().trim(),
          });
        } else if (href.startsWith('mailto:')) {
          links.push({
            url: href,
            type: 'mailto',
            text: $(element).text().trim(),
          });
        }
      }
    });

    // 2. Look for links in footer sections
    $('footer a, .footer a, #footer a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().toLowerCase();
      
      if (href && href.startsWith('http') && 
          (text.includes('unsubscribe') || href.toLowerCase().includes('unsubscribe'))) {
        // Check if not already added
        if (!links.find(l => l.url === href)) {
          links.push({
            url: href,
            type: 'http',
            text: $(element).text().trim(),
          });
        }
      }
    });

    // 3. Check for List-Unsubscribe header
    if (headers && headers['list-unsubscribe']) {
      const listUnsubscribe = headers['list-unsubscribe'];
      const urlMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
      if (urlMatch) {
        links.push({
          url: urlMatch[1],
          type: 'http',
          text: 'List-Unsubscribe Header',
        });
      }
      
      const mailtoMatch = listUnsubscribe.match(/<(mailto:[^>]+)>/);
      if (mailtoMatch) {
        links.push({
          url: mailtoMatch[1],
          type: 'mailto',
          text: 'List-Unsubscribe Email',
        });
      }
    }

    // Remove duplicates
    const uniqueLinks = links.filter((link, index, self) =>
      index === self.findIndex((l) => l.url === link.url)
    );

    return uniqueLinks;
  }

  /**
   * Find the most likely unsubscribe link
   */
  findBestUnsubscribeLink(links: UnsubscribeLink[]): UnsubscribeLink | null {
    if (links.length === 0) return null;

    // Prefer http links over mailto
    const httpLinks = links.filter(l => l.type === 'http');
    if (httpLinks.length > 0) {
      // Prefer links from List-Unsubscribe header
      const headerLink = httpLinks.find(l => l.text?.includes('List-Unsubscribe'));
      if (headerLink) return headerLink;
      
      // Return the first http link
      return httpLinks[0];
    }

    // Fall back to mailto
    return links[0];
  }
}
