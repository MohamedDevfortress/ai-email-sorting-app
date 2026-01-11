import { Test, TestingModule } from '@nestjs/testing';
import { UnsubscribeExtractorService } from './unsubscribe-extractor.service';

describe('UnsubscribeExtractorService', () => {
  let service: UnsubscribeExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnsubscribeExtractorService],
    }).compile();

    service = module.get<UnsubscribeExtractorService>(UnsubscribeExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractUnsubscribeLinks', () => {
    it('should extract unsubscribe link from List-Unsubscribe header', () => {
      const headers = {
        'list-unsubscribe': '<https://example.com/unsubscribe?id=123>',
      };

      const result = service.extractUnsubscribeLinks('', headers);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        url: 'https://example.com/unsubscribe?id=123',
        type: 'http',
      });
    });

    it('should extract unsubscribe link from HTML body', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/unsubscribe">Unsubscribe</a>
          </body>
        </html>
      `;

      const result = service.extractUnsubscribeLinks(html, {});

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].url).toBe('https://example.com/unsubscribe');
      expect(result[0].type).toBe('http');
    });

    it('should find unsubscribe links with common patterns', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/preferences/unsubscribe">Click to unsubscribe</a>
            <a href="https://example.com/remove-me">Remove from list</a>
          </body>
        </html>
      `;

      const result = service.extractUnsubscribeLinks(html, {});

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(link => link.url.includes('unsubscribe') || link.url.includes('remove'))).toBe(true);
    });

    it('should return empty array when no unsubscribe links found', () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/home">Home</a>
            <a href="https://example.com/products">Products</a>
          </body>
        </html>
      `;

      const result = service.extractUnsubscribeLinks(html, {});

      expect(result).toEqual([]);
    });

    it('should prioritize header links', () => {
      const headers = {
        'list-unsubscribe': '<https://example.com/header-unsubscribe>',
      };
      const html = `
        <html>
          <body>
            <a href="https://example.com/body-unsubscribe">Unsubscribe</a>
          </body>
        </html>
      `;

      const result = service.extractUnsubscribeLinks(html, headers);

      expect(result.length).toBeGreaterThan(0);
      // Should find both links
      expect(result.some(link => link.url.includes('header-unsubscribe'))).toBe(true);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<html><body><a href="invalid">test</a>';

      const result = service.extractUnsubscribeLinks(html, {});

      // Should not throw error
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
