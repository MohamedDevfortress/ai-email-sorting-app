import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { AiService } from '../ai/ai.service';

export interface UnsubscribeResult {
  success: boolean;
  message: string;
  screenshot?: string;
  error?: string;
  isCloudflare?: boolean;
}

@Injectable()
export class UnsubscribeAutomationService {
  private browser: Browser | null = null;

  constructor(private aiService: AiService) {}

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Navigate to unsubscribe URL and attempt to complete the process
   */
  async unsubscribeFromUrl(url: string, userEmail?: string): Promise<UnsubscribeResult> {
    let page: Page | null = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      // Set longer timeout for slow pages
      page.setDefaultTimeout(60000); // 60 seconds

      // Navigate to unsubscribe page
      console.log(`Navigating to: ${url}`);
      
      // Use domcontentloaded instead of networkidle for faster, more reliable loading
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Wait a bit for any dynamic content
      await page.waitForTimeout(2000);

      // Check for Cloudflare challenge
      const isCloudflare = await this.detectCloudflare(page);
      if (isCloudflare) {
        console.log('Cloudflare challenge detected, waiting longer...');
        // Wait up to 30 seconds for Cloudflare to resolve
        await page.waitForTimeout(10000);
        
        // Check again
        const stillCloudflare = await this.detectCloudflare(page);
        if (stillCloudflare) {
          console.log('Cloudflare challenge did not resolve');
          await page.close();
          return {
            success: false,
            message: 'Page protected by Cloudflare. Please visit the link manually.',
            error: 'Cloudflare protection detected',
            isCloudflare: true,
          };
        }
      }

      // Check if page already shows unsubscribe success (like Bayt.com)
      const successDetected = await this.detectSuccessMessage(page);
      if (successDetected) {
        console.log('Auto-unsubscribe detected! Page shows success message.');
        await page.close();
        return {
          success: true,
          message: 'Successfully unsubscribed (auto-detected)',
        };
      }

      // Extract page information for AI analysis
      const pageInfo = await this.extractPageInfo(page);

      // Try common unsubscribe patterns first (faster than AI)
      const quickResult = await this.tryCommonPatterns(page);
      if (quickResult.success) {
        // Wait a bit and check for success message
        await page.waitForTimeout(2000);
        const finalCheck = await this.detectSuccessMessage(page);
        
        await page.close();
        return {
          success: true,
          message: finalCheck 
            ? 'Successfully completed unsubscribe form'
            : 'Clicked unsubscribe button (assumed success)',
        };
      }

      // If quick patterns fail, use AI to analyze and complete the unsubscribe
      if (userEmail) {
        console.log('Common patterns failed, using AI to analyze page...');
        
        const aiResult = await this.aiService.analyzeUnsubscribePage(
          pageInfo,
          userEmail,
        );

        console.log('AI reasoning:', aiResult.reasoning);
        console.log('AI actions:', JSON.stringify(aiResult.actions, null, 2));

        if (aiResult.actions && aiResult.actions.length > 0) {
          // Execute AI-generated actions
          const executionResult = await this.executeAIActions(page, aiResult.actions);
          
          if (executionResult.success) {
            // Check for success message
            await page.waitForTimeout(2000);
            const successCheck = await this.detectSuccessMessage(page);
            
            await page.close();
            return {
              success: true,
              message: successCheck
                ? 'Successfully unsubscribed using AI-powered form filling'
                : 'Completed AI-suggested actions (assumed success)',
            };
          }
        }
      }

      // If quick patterns fail, we'll need AI (to be implemented)
      // For now, just report what we found
      console.log('Page info:', JSON.stringify(pageInfo, null, 2));

      // Take screenshot for debugging
      const screenshot = await page.screenshot({ fullPage: true, type: 'png' });

      await page.close();

      return {
        success: false,
        message: 'Could not automatically unsubscribe. Please visit the link manually.',
        screenshot: screenshot.toString('base64'),
      };

    } catch (error) {
      console.error('Unsubscribe automation error:', error);
      
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // Ignore
        }
      }

      return {
        success: false,
        message: 'Failed to process unsubscribe link',
        error: error.message,
      };
    }
  }

  /**
   * Extract page structure for AI analysis
   */
  private async extractPageInfo(page: Page) {
    return await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(b => ({
        text: b.textContent?.trim() || (b as HTMLInputElement).value,
        id: (b as HTMLElement).id,
        className: (b as HTMLElement).className,
        type: (b as HTMLElement).tagName,
      }));

      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.href,
        id: a.id,
        className: a.className,
      }));

      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
          type: (i as HTMLInputElement).type,
          name: (i as HTMLInputElement).name,
          id: (i as HTMLElement).id,
          placeholder: (i as HTMLInputElement).placeholder,
        })),
      }));

      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(c => ({
        id: (c as HTMLElement).id,
        name: (c as HTMLInputElement).name,
        checked: (c as HTMLInputElement).checked,
        label: document.querySelector(`label[for="${(c as HTMLElement).id}"]`)?.textContent?.trim(),
      }));

      return {
        title: document.title,
        url: window.location.href,
        buttons,
        links,
        forms,
        checkboxes,
      };
    });
  }

  /**
   * Try common unsubscribe patterns
   */
  private async tryCommonPatterns(page: Page): Promise<UnsubscribeResult> {
    try {
      // Pattern 1: Look for buttons with "unsubscribe" text
      const unsubscribeButtons = [
        'button:has-text("Unsubscribe")',
        'button:has-text("unsubscribe")',
        'a:has-text("Unsubscribe")',
        'a:has-text("unsubscribe")',
        'input[value*="unsubscribe" i]',
        'input[value*="Unsubscribe"]',
        'button:has-text("Confirm")',
        'button[type="submit"]',
      ];

      for (const selector of unsubscribeButtons) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            console.log(`Found unsubscribe button: ${selector}`);
            await button.click();
            await page.waitForTimeout(3000); // Wait for submission
            
            return {
              success: true,
              message: 'Successfully clicked unsubscribe button',
            };
          }
        } catch (e) {
          // Try next pattern
          continue;
        }
      }

      // Pattern 2: Look for forms with checkboxes/radio buttons
      const forms = await page.locator('form').all();
      for (const form of forms) {
        try {
          // Look for unsubscribe-related checkboxes or radio buttons
          const checkboxes = await form.locator('input[type="checkbox"], input[type="radio"]').all();
          
          for (const checkbox of checkboxes) {
            const label = await this.getCheckboxLabel(page, checkbox);
            if (label && (
              label.toLowerCase().includes('unsubscribe') || 
              label.toLowerCase().includes('opt out') ||
              label.toLowerCase().includes('stop receiving') ||
              label.toLowerCase().includes('remove me')
            )) {
              console.log(`Found unsubscribe checkbox/radio: ${label}`);
              
              // Check the checkbox/radio if not already checked
              if (!await checkbox.isChecked()) {
                await checkbox.check();
              }
              
              // Look for submit button in this form
              const submitButton = form.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Save")').first();
              if (await submitButton.isVisible({ timeout: 1000 })) {
                console.log('Found and clicking submit button');
                await submitButton.click();
                await page.waitForTimeout(3000);
                
                return {
                  success: true,
                  message: 'Successfully completed unsubscribe form',
                };
              }
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Pattern 3: Generic form submission (if form has email input or preference fields)
      for (const form of forms) {
        try {
          const textInputs = await form.locator('input[type="text"], input[type="email"]').all();
          
          // If form has inputs and a submit button, try submitting
          if (textInputs.length > 0) {
            const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
            if (await submitButton.isVisible({ timeout: 1000 })) {
              console.log('Found form with submit button, attempting submission');
              await submitButton.click();
              await page.waitForTimeout(3000);
              
              return {
                success: true,
                message: 'Successfully submitted form',
              };
            }
          }
        } catch (e) {
          continue;
        }
      }

      return {
        success: false,
        message: 'No common patterns matched',
      };

    } catch (error) {
      return {
        success: false,
        message: 'Pattern matching failed',
        error: error.message,
      };
    }
  }

  /**
   * Get label text for a checkbox
   */
  private async getCheckboxLabel(page: Page, checkbox: any): Promise<string | null> {
    try {
      const id = await checkbox.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).first().textContent();
        if (label) return label.trim();
      }

      // Try parent label
      const parentLabel = await checkbox.locator('xpath=ancestor::label').first().textContent();
      if (parentLabel) return parentLabel.trim();

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Detect if page is showing Cloudflare challenge
   */
  private async detectCloudflare(page: Page): Promise<boolean> {
    try {
      const title = await page.title();
      const content = await page.content();
      
      // Check for Cloudflare indicators
      return (
        title.includes('Just a moment') ||
        title.includes('Attention Required') ||
        content.includes('cloudflare') ||
        content.includes('cf-browser-verification') ||
        content.includes('Checking your browser')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect if page shows unsubscribe success message
   */
  private async detectSuccessMessage(page: Page): Promise<boolean> {
    try {
      const content = await page.content();
      const textContent = await page.evaluate(() => document.body.innerText.toLowerCase());

      // Success patterns to look for
      const successPatterns = [
        'unsubscribed',
        'you have been unsubscribed',
        'successfully unsubscribed',
        'you will no longer receive',
        'preference updated',
        'preferences saved',
        'email preferences updated',
        'you are now unsubscribed',
        'removed from',
        'subscription removed',
        'opt-out successful',
      ];

      // Check if any success pattern is in the page text
      return successPatterns.some(pattern => textContent.includes(pattern));
    } catch (e) {
      return false;
    }
  }

  /**
   * Execute actions generated by AI
   */
  private async executeAIActions(page: Page, actions: any[]): Promise<{ success: boolean; message: string }> {
    try {
      for (const action of actions) {
        console.log(`Executing AI action: ${action.description || action.type}`);
        
        switch (action.type) {
          case 'fill':
            try {
              await page.fill(action.selector, action.value, { timeout: 5000 });
              console.log(`Filled ${action.selector} with ${action.value}`);
            } catch (e) {
              console.error(`Failed to fill ${action.selector}:`, e.message);
            }
            break;

          case 'click':
            try {
              await page.click(action.selector, { timeout: 5000 });
              console.log(`Clicked ${action.selector}`);
              await page.waitForTimeout(1000);
            } catch (e) {
              console.error(`Failed to click ${action.selector}:`, e.message);
            }
            break;

          case 'check':
            try {
              await page.check(action.selector, { timeout: 5000 });
              console.log(`Checked ${action.selector}`);
            } catch (e) {
              console.error(`Failed to check ${action.selector}:`, e.message);
            }
            break;

          case 'select':
            try {
              await page.selectOption(action.selector, action.value, { timeout: 5000 });
              console.log(`Selected ${action.value} in ${action.selector}`);
            } catch (e) {
              console.error(`Failed to select in ${action.selector}:`, e.message);
            }
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      }

      // Wait a bit after all actions
      await page.waitForTimeout(2000);

      return {
        success: true,
        message: 'Successfully executed AI actions',
      };
    } catch (error) {
      console.error('Error executing AI actions:', error);
      return {
        success: false,
        message: 'Failed to execute AI actions',
      };
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }
}
