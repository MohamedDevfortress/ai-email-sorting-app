import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
  }

  async categorizeEmail(content: string, categories: { name: string; description: string }[]): Promise<string | null> {
    if (!categories.length) return null;

    const categoryList = categories.map(cat => `- "${cat.name}": ${cat.description}`).join('\n');
    
    const prompt = `You are an AI email categorization assistant. Your task is to analyze an email and assign it to the MOST APPROPRIATE category from the user's predefined list.

AVAILABLE CATEGORIES:
${categoryList}

EMAIL TO CATEGORIZE:
${content.substring(0, 3000)}

INSTRUCTIONS:
1. Carefully read the email content
2. Match the email to the BEST fitting category based on the category descriptions
3. Consider the primary purpose and topic of the email
4. If multiple categories could fit, choose the MOST SPECIFIC one
5. Only use categories from the list above - do NOT create new categories
6. If the email truly doesn't fit ANY category well, respond with: "NONE"

RESPONSE FORMAT:
Return ONLY the exact category name (case-sensitive, including quotes) from the list above, or "NONE" if no good match exists.
Do NOT include explanations or any other text - just the category name.

Category:`;

    console.log('Categorization Prompt:', prompt);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent categorization
      max_tokens: 50, // We only need the category name
    });

    let categoryName = response.choices[0].message.content?.trim();
    
    // Remove quotes if AI added them
    if (categoryName) {
      categoryName = categoryName.replace(/^["']|["']$/g, '');
    }
    
    // Validate that the returned category exists in the user's list
    const validCategory = categories.find(cat => cat.name === categoryName);
    
    if (validCategory) {
      return categoryName!; // We know it's not null/undefined here
    } else if (categoryName === 'NONE') {
      // No good match found - return null to indicate uncategorized
      console.log('AI determined no good category match');
      return null;
    } else {
      // AI returned an invalid category - log warning and return null
      console.warn(`AI returned invalid category: "${categoryName}". Available categories:`, categories.map(c => c.name));
      return null;
    }
  }

  async summarizeEmail(content: string): Promise<string> {
    const prompt = `You are an AI email summarization assistant. Create a concise, informative summary of the following email.

EMAIL CONTENT:
${content.substring(0, 4000)}

INSTRUCTIONS:
1. Create a 1-2 sentence summary that captures the main point and any required actions
2. Focus on the key information: what is this email about and what (if anything) does the recipient need to do
3. Use clear, professional language
4. If there's a call-to-action or deadline, include it
5. Keep it under 100 words

RESPONSE FORMAT:
Return ONLY the summary text - no preamble, no "Summary:" label, just the summary itself.

Summary:`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5, // Balanced creativity and consistency
      max_tokens: 150,
    });

    return response.choices[0].message.content?.trim() || 'No summary available';
  }
}
