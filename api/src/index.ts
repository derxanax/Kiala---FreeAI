import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
// @ts-ignore
import morgan from 'morgan';

const QWEN_URL = 'https://chat.qwen.ai/';
const SESSION_DIR = path.join(__dirname, '..', 'sessions');
const SESSION_PATH = path.join(SESSION_DIR, 'qwen_session.json');
const API_PORT = 3700;

interface SessionData {
  cookies: any[];
  localStorage?: Record<string, string>;
  timestamp: string;
}

interface SendMessageRequest {
  message: string;
}

let browserPage: Page | null = null;
let browserInstance: Browser | null = null;
let isPageReady = false;

async function setupPuppeteer(): Promise<Browser> {
  puppeteer.use(StealthPlugin());

  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    userDataDir: path.join(SESSION_DIR, 'chrome_data')
  });

  return browser;
}

async function loadCookies(page: Page): Promise<void> {
  if (fs.existsSync(SESSION_PATH)) {
    try {
      const sessionData: SessionData = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));

      if (sessionData.cookies?.length > 0) {
        await page.setCookie(...sessionData.cookies);
      }
    } catch (error) {
      console.error('Error loading cookies:', error);
    }
  }
}

async function loadLocalStorage(page: Page): Promise<void> {
  if (fs.existsSync(SESSION_PATH)) {
    try {
      const sessionData: SessionData = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));

      if (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) {
        await page.evaluate((storageData) => {
          for (const key in storageData) {
            try {
              window.localStorage.setItem(key, storageData[key]);
            } catch (e) {
              console.warn(`Failed to set localStorage key: ${key}`, e);
            }
          }
        }, sessionData.localStorage);
      }
    } catch (error) {
      console.error('Error loading localStorage:', error);
    }
  }
}

async function saveSession(page: Page): Promise<void> {
  try {
    const cookies = await page.cookies();

    let localStorage = {};
    try {
      localStorage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            items[key] = window.localStorage.getItem(key) || '';
          }
        }
        return items;
      });
    } catch (error) {
      console.error('Error retrieving localStorage:', error);
    }

    const sessionData: SessionData = {
      cookies,
      localStorage,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving session:', error);
  }
}

async function sendMessageToQwen(page: Page, message: string): Promise<{ success: boolean, response?: string }> {
  try {
    let completedResponseReceived = false;
    let jsonAssistant: string | null = null;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/chat/completed')) {
        completedResponseReceived = true;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (url.includes('/api/v1/chats/') && response.request().method() === 'POST') {
        try {
          const data = await response.json();
          // Try to extract assistant message from standard structure
          if (data && data.chat && data.chat.history && data.chat.history.currentId) {
            const currentId = data.chat.history.currentId;
            const msgObj = data.chat.history.messages[currentId];
            if (msgObj && msgObj.role === 'assistant') {
              if (msgObj.content_list && msgObj.content_list.length > 0) {
                jsonAssistant = msgObj.content_list[0].content;
                completedResponseReceived = true;
              } else if (msgObj.content) {
                jsonAssistant = msgObj.content;
                completedResponseReceived = true;
              }
            }
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
    });

    await page.waitForSelector('#chat-input', { timeout: 5000 });

    await page.evaluate(() => {
      const thinkingBtn = document.querySelector('button.chat-input-feature-btn');
      if (thinkingBtn) {
        thinkingBtn.classList.remove('active');
        (thinkingBtn as HTMLElement).style.opacity = '0.5';
        thinkingBtn.setAttribute('disabled', 'true');
        thinkingBtn.setAttribute('aria-disabled', 'true');
      }
      
      const thinkingTooltip = document.querySelector('div[aria-label="Thinking"]');
      if (thinkingTooltip) {
        (thinkingTooltip as HTMLElement).style.display = 'none';
      }
      
      const thinkingBudgetBtn = document.querySelector('.chat-message-input-thinking-budget-btn');
      if (thinkingBudgetBtn) {
        (thinkingBudgetBtn as HTMLElement).style.display = 'none';
        thinkingBudgetBtn.setAttribute('disabled', 'true');
        thinkingBudgetBtn.setAttribute('aria-disabled', 'true');
      }
      
      const thinkingText = document.querySelector('span.chat-input-feature-btn-text[data-spm-anchor-id*="PNsTRJ"]');
      if (thinkingText) {
        (thinkingText as HTMLElement).style.opacity = '0.5';
      }
      
      const thinkingBudget = document.querySelector('.chat-message-input-thinking-budget');
      if (thinkingBudget) {
        (thinkingBudget as HTMLElement).style.display = 'none';
      }
    });

    await page.evaluate((text) => {
      const inputField = document.querySelector('#chat-input') as HTMLTextAreaElement;
      if (inputField) {
        inputField.value = text;
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        inputField.dispatchEvent(inputEvent);
        inputField.dispatchEvent(changeEvent);
      }
    }, message);

    await new Promise(resolve => setTimeout(resolve, 500));

    const sendButtonSelector = '#send-message-button';
    await page.waitForSelector(sendButtonSelector, { visible: true, timeout: 5000 });
    await page.click(sendButtonSelector);

    const preMessageCount = await page.evaluate(() => {
      return document.querySelectorAll('p[data-spm-anchor-id]').length;
    });

    const MAX_WAIT_TIME = 45000;
    const startTime = Date.now();
    const POLL_INTERVAL = 300;

    while ((Date.now() - startTime) < MAX_WAIT_TIME) {
      if (completedResponseReceived) break;
      const currentCount = await page.evaluate(() => document.querySelectorAll('p[data-spm-anchor-id]').length);
      if (currentCount > preMessageCount) {
        break;
      }
      await new Promise(res => setTimeout(res, POLL_INTERVAL));
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));

    await page.evaluate(() => {
      try {
        const thinkingBtn = document.querySelector('button.chat-input-feature-btn.active');
        if (thinkingBtn) {
          thinkingBtn.classList.remove('active');
          (thinkingBtn as HTMLElement).style.opacity = '0.5';
          thinkingBtn.setAttribute('disabled', 'true');
          thinkingBtn.setAttribute('aria-disabled', 'true');
        }
        
        const thinkingTooltip = document.querySelector('div[aria-label="Thinking"]');
        if (thinkingTooltip) {
          (thinkingTooltip as HTMLElement).style.display = 'none';
        }
        
        const thinkingBudgetBtn = document.querySelector('.chat-message-input-thinking-budget-btn');
        if (thinkingBudgetBtn) {
          (thinkingBudgetBtn as HTMLElement).style.display = 'none';
          thinkingBudgetBtn.setAttribute('disabled', 'true');
          thinkingBudgetBtn.setAttribute('aria-disabled', 'true');
        }
        
        const thinkingText = document.querySelector('span.chat-input-feature-btn-text[data-spm-anchor-id*="PNsTRJ"]');
        if (thinkingText) {
          (thinkingText as HTMLElement).style.opacity = '0.5';
        }
        
        const thinkingBudget = document.querySelector('.chat-message-input-thinking-budget');
        if (thinkingBudget) {
          (thinkingBudget as HTMLElement).style.display = 'none';
        }
      } catch (error) {}
    });

    let responseText: string = '';
    if (!jsonAssistant) {
      responseText = await page.evaluate(() => {
        function cleanResponseText(text: string | null): string {
          if (!text) return '';
          
          let cleanText = text;
          
          const serviceWords = ['Copy', 'Ask', 'Explain', 'Share', 'Копировать', 'Спросить', 'Объяснить', 'Поделиться'];
          
          for (const word of serviceWords) {
            const regex = new RegExp(`\\s*${word}\\s*$`, 'i');
            cleanText = cleanText.replace(regex, '');
          }
          
          cleanText = cleanText.replace(/\s*(Copy|Ask|Explain|Share)\s+(Copy|Ask|Explain|Share)(\s+(Copy|Ask|Explain|Share))?\s*$/gi, '');
          
          for (let i = 0; i < 3; i++) {
            cleanText = cleanText
              .replace(/\s+(Copy|Ask|Explain|Share)\s*$/gi, '')
              .replace(/\s+(Копировать|Спросить|Объяснить|Поделиться)\s*$/gi, '');
          }
          
          cleanText = cleanText.replace(/\s+$/g, '');
          cleanText = cleanText.replace(/\s{2,}/g, ' ');
          
          return cleanText.trim();
        }
        
        const eventElements = document.querySelectorAll('div.event');
        if (eventElements.length > 0) {
          const lastEvent = eventElements[eventElements.length - 1];
          const p = lastEvent.querySelector('p[data-spm-anchor-id]');
          if (p && p.textContent) {
            return cleanResponseText(p.textContent);
          }
        }

        const pElements = document.querySelectorAll('p[data-spm-anchor-id]');
        if (pElements.length > 0) {
          return cleanResponseText(pElements[pElements.length - 1].textContent);
        }

        const responseContainers = document.querySelectorAll('[class*="response-content-container"], [id*="response-content-container"]');
        if (responseContainers.length > 0) {
          const lastContainer = responseContainers[responseContainers.length - 1];
          return cleanResponseText(lastContainer.textContent);
        }

        const markdownContainers = document.querySelectorAll('[class*="markdown-prose"]');
        if (markdownContainers.length > 0) {
          return cleanResponseText(markdownContainers[markdownContainers.length - 1].textContent);
        }

        return '';
      });
    } else {
      responseText = jsonAssistant;
    }
    
    return { success: true, response: responseText };
  } catch (error) {
    console.error('Error during message exchange:', error);
    return { success: false };
  } finally {
    await page.setRequestInterception(false);
  }
}

async function setupBrowserAndPage(): Promise<void> {
  try {
    browserInstance = await setupPuppeteer();
    browserPage = await browserInstance.newPage();

    await loadCookies(browserPage);

    await browserPage.setDefaultNavigationTimeout(60000);

    await browserPage.goto(QWEN_URL, { waitUntil: 'domcontentloaded' });

    await browserPage.waitForSelector('#chat-input', { timeout: 30000 });

    await loadLocalStorage(browserPage);

    const sessionSaver = setInterval(() => {
      if (browserPage) {
        saveSession(browserPage).catch(console.error);
      }
    }, 30000);

    browserInstance.on('disconnected', () => {
      clearInterval(sessionSaver);
      browserPage = null;
      browserInstance = null;
      isPageReady = false;
    });

    isPageReady = true;
  } catch (error) {
    console.error('Error during browser setup:', error);
    if (browserInstance) {
      await browserInstance.close();
    }
    browserPage = null;
    browserInstance = null;
    isPageReady = false;

    setTimeout(() => {
      setupBrowserAndPage().catch(console.error);
    }, 10000);
  }
}

async function setupApiServer(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  app.use(express.static(path.join(__dirname, '..')));

  // Morgan logging
  morgan.token('body', (req: any) => {
    try {
      return JSON.stringify(req.body).slice(0, 120);
    } catch {
      return '';
    }
  });
  app.use(morgan(':method :url :status :response-time ms :body'));

  app.get('/', (req, res) => {
    res.redirect('/test-client.html');
  });

  app.get('/api/status', (req, res) => {
    res.json({
      status: isPageReady ? 'ready' : 'initializing',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/send', async (req, res) => {
    const { message } = req.body as SendMessageRequest;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!isPageReady || !browserPage) {
      return res.status(503).json({ success: false, error: 'Browser is not ready yet, please try again later' });
    }

    try {
      const result = await sendMessageToQwen(browserPage, message);

      if (result.success) {
        res.json({
          success: true,
          message: 'Message sent and response received',
          response: result.response || '',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ success: false, error: 'Failed to send message or get response from QWen AI' });
      }
    } catch (error) {
      console.error('Error in /api/send endpoint:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  app.post('/api/new-chat', async (req, res) => {
    if (!isPageReady || !browserPage) {
      return res.status(503).json({ success: false, error: 'Browser is not ready yet, please try again later' });
    }
    
    try {
      // Navigate to the main Qwen chat page
      await browserPage.goto(QWEN_URL, { waitUntil: 'networkidle2' });
      
      // Wait for the page to be fully loaded
      await browserPage.waitForSelector('#chat-input', { timeout: 5000 }).catch(() => {});
      
      // Check if the "New Chat" button exists and click it
      const newChatButton = await browserPage.$('button[aria-label="New chat"], a.new-chat-button');
      if (newChatButton) {
        await newChatButton.click();
        await browserPage.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
      }
      
      // Save the updated session after creating a new chat
      await saveSession(browserPage);
      
      res.json({
        success: true,
        message: 'New chat created',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating new chat:', error);
      res.status(500).json({ success: false, error: 'Failed to create new chat' });
    }
  });

  app.listen(API_PORT, () => {});
}

async function main(): Promise<void> {
  await setupApiServer();
  await setupBrowserAndPage();

  process.on('SIGINT', async () => {
    if (browserPage) {
      await saveSession(browserPage);
    }
    if (browserInstance) {
      await browserInstance.close();
    }
    process.exit(0);
  });
}

main().catch(console.error);
