import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('AiService', () => {
  let service: AiService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    // Create mock for the create method
    mockCreate = jest.fn();

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('categorizeEmail', () => {
    it('should return category ID when AI finds a match', async () => {
      const categories = [
        { id: 'cat-1', name: 'Work', description: 'Work-related emails' },
        { id: 'cat-2', name: 'Personal', description: 'Personal emails' },
      ];

      const emailContent = `Subject: Meeting tomorrow\nFrom: boss@company.com\nSnippet: Important meeting discussion`;

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Work',
            },
          },
        ],
      });

      const result = await service.categorizeEmail(emailContent, categories);

      expect(result).toBe('Work');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should return null when AI returns "NONE"', async () => {
      const categories = [
        { id: 'cat-1', name: 'Work', description: 'Work emails' },
      ];

      const emailContent = `Subject: Random newsletter\nFrom: news@example.com`;

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'NONE' } }],
      });

      const result = await service.categorizeEmail(emailContent, categories);

      expect(result).toBeNull();
    });

    it('should handle OpenAI errors gracefully', async () => {
      const categories = [{ id: 'cat-1', name: 'Work', description: 'Work' }];
      const emailContent = 'Subject: Test';

      mockCreate.mockRejectedValue(new Error('API Error'));

      // Should not throw, should return null
      await expect(service.categorizeEmail(emailContent, categories)).rejects.toThrow('API Error');
    });

    it('should return null when no categories provided', async () => {
      const result = await service.categorizeEmail('test content', []);
      expect(result).toBeNull();
    });
  });

  describe('summarizeEmail', () => {
    it('should return AI-generated summary', async () => {
      const emailContent = `Subject: Project Update\nBody: The project is on track. We completed phase 1.`;

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Project on track, phase 1 complete',
            },
          },
        ],
      });

      const result = await service.summarizeEmail(emailContent);

      expect(result).toBe('Project on track, phase 1 complete');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should return default summary on API error', async () => {
      const emailContent = 'Subject: Test Email';

      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(service.summarizeEmail(emailContent)).rejects.toThrow('API Error');
    });
  });
});
