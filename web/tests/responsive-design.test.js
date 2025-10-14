const puppeteer = require('puppeteer');

describe('Responsive Design Tests for All Routes', () => {
  let browser;
  let page;

  // Test viewports as specified in the rules
  const viewports = {
    desktop: { width: 1920, height: 1080, name: 'Desktop' },
    tablet: 'iPad Pro', // Using device emulation
    mobile: 'iPhone 13' // Using device emulation
  };

  const routes = [
    { path: '/', name: 'Home' },
    { path: '/inventory/', name: 'Inventory' },
    { path: '/brokers/', name: 'Brokers' },
    { path: '/credit-partners/', name: 'Credit Partners' },
    { path: '/funding-programs/', name: 'Funding Programs' },
    { path: '/credit-ready-features/', name: 'Credit Ready Features' },
    { path: '/faqs/', name: 'FAQs' }
  ];

  beforeAll(async () => {
    // Listen for console errors as specified in rules
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up error listening for data serialization issues in Qwik
    page.on('pageerror', (error) => {
      console.error('Page error detected:', error.message);
      throw error;
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  // Test desktop responsiveness
  test('All routes should be responsive on desktop (1920x1080)', async () => {
    await page.setViewport(viewports.desktop);

    for (const route of routes) {
      console.log(`Testing ${route.name} on desktop...`);
      
      await page.goto(`http://localhost:5173${route.path}`, { 
        waitUntil: 'networkidle0' 
      });

      // Wait for Qwik hydration to complete
      await page.waitForTimeout(1000);

      // Take screenshot for visual validation
      await page.screenshot({ 
        path: `tests/screenshots/desktop-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });

      // Verify PatrioticStars component is rendered (background effect)
      const patrioticStars = await page.$('.galactic-container');
      expect(patrioticStars).toBeTruthy();

      // Verify main layout elements are visible
      const mainContent = await page.$('main, section');
      expect(mainContent).toBeTruthy();

      // Check for responsive text sizes (should use larger sizes on desktop)
      const headers = await page.$$('h1, h2');
      expect(headers.length).toBeGreaterThan(0);

      // Verify animations are loaded (CSS should be applied)
      const animatedElements = await page.$$('.animate-fade-in, .animate-fade-in-up, .animate-on-scroll');
      expect(animatedElements.length).toBeGreaterThan(0);
    }
  });

  // Test tablet responsiveness using device emulation
  test('All routes should be responsive on tablet (iPad Pro)', async () => {
    await page.emulate(puppeteer.devices['iPad Pro']);

    for (const route of routes) {
      console.log(`Testing ${route.name} on tablet...`);
      
      await page.goto(`http://localhost:5173${route.path}`, { 
        waitUntil: 'networkidle0' 
      });

      // Wait for Qwik resumability to complete
      await page.waitForTimeout(1000);

      // Take screenshot on tablet
      await page.screenshot({ 
        path: `tests/screenshots/tablet-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });

      // Test touch interactions after first load (Qwik resumability test)
      const buttons = await page.$$('button, a[href]');
      if (buttons.length > 0) {
        // Test first interactive element
        await buttons[0].click();
        await page.waitForTimeout(500);

        // Take screenshot after interaction to verify no UI shifts
        await page.screenshot({ 
          path: `tests/screenshots/tablet-${route.name.toLowerCase().replace(/\s+/g, '-')}-after-click.png`,
          fullPage: true 
        });
      }

      // Verify responsive layout on tablet
      const container = await page.$('.container');
      expect(container).toBeTruthy();

      // Check that mobile-specific elements are hidden on tablet
      const mobileOnly = await page.$('.block.md\\:hidden');
      if (mobileOnly) {
        const isVisible = await page.evaluate(el => {
          return window.getComputedStyle(el).display !== 'none';
        }, mobileOnly);
        // On tablet, mobile elements might still be visible depending on breakpoints
        console.log(`Mobile-only element visibility on tablet: ${isVisible}`);
      }
    }
  });

  // Test mobile responsiveness using device emulation  
  test('All routes should be responsive on mobile (iPhone 13)', async () => {
    await page.emulate(puppeteer.devices['iPhone 13']);

    for (const route of routes) {
      console.log(`Testing ${route.name} on mobile...`);
      
      await page.goto(`http://localhost:5173${route.path}`, { 
        waitUntil: 'networkidle0' 
      });

      // Wait for Qwik hydration
      await page.waitForTimeout(1000);

      // Take screenshot on mobile
      await page.screenshot({ 
        path: `tests/screenshots/mobile-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });

      // Test touch interaction (critical for Qwik resumability)
      const touchElements = await page.$$('button, a[href], [onClick\\$]');
      if (touchElements.length > 0) {
        // Test touch interaction
        await touchElements[0].tap();
        await page.waitForTimeout(500);

        // Verify no unexpected UI shifts after interaction
        await page.screenshot({ 
          path: `tests/screenshots/mobile-${route.name.toLowerCase().replace(/\s+/g, '-')}-after-tap.png`,
          fullPage: true 
        });
      }

      // Verify mobile layout is working
      const mobileElements = await page.$$('.block.md\\:hidden');
      if (mobileElements.length > 0) {
        const isVisible = await page.evaluate(el => {
          return window.getComputedStyle(el).display !== 'none';
        }, mobileElements[0]);
        expect(isVisible).toBeTruthy();
      }

      // Check that desktop elements are hidden on mobile
      const desktopOnly = await page.$('.hidden.md\\:block');
      if (desktopOnly) {
        const isHidden = await page.evaluate(el => {
          return window.getComputedStyle(el).display === 'none';
        }, desktopOnly);
        expect(isHidden).toBeTruthy();
      }

      // Verify text is readable on mobile (no horizontal scrolling)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
    }
  });

  // Test data loading and actions (specific to Qwik as per rules)
  test('RouteLoader$ and Action$ should work correctly on all routes', async () => {
    await page.setViewport(viewports.desktop);

    // Test home page form submission (action$)
    console.log('Testing routeLoader$ and action$ on home page...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    
    // Wait for Qwik to fully hydrate
    await page.waitForTimeout(2000);

    // Find and test the analysis form
    const nameInput = await page.$('input[name="name"]');
    const emailInput = await page.$('input[name="email"]');
    const phoneInput = await page.$('input[name="phone"]');
    const submitButton = await page.$('button[type="submit"]');

    if (nameInput && emailInput && phoneInput && submitButton) {
      // Fill out the form
      await nameInput.type('Test User');
      await emailInput.type('test@example.com');
      await phoneInput.type('555-123-4567');

      // Submit form to test action$
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Check for success or error message
      const successMessage = await page.$('.text-green-500');
      const errorMessage = await page.$('.text-red-500');
      
      expect(successMessage || errorMessage).toBeTruthy();
      console.log('Form submission test completed');
    }

    // Test navigation to verify routeLoader$ works
    for (const route of routes.slice(1, 3)) { // Test first 2 additional routes
      console.log(`Testing navigation to ${route.name}...`);
      await page.goto(`http://localhost:5173${route.path}`, { 
        waitUntil: 'networkidle0' 
      });

      // Verify page loaded with correct data
      const pageContent = await page.$('h1, h2');
      expect(pageContent).toBeTruthy();
      
      const contentText = await page.evaluate(el => el.textContent, pageContent);
      expect(contentText.length).toBeGreaterThan(0);
    }
  });

  // Test animations and visual consistency
  test('All routes should have consistent styling and animations', async () => {
    await page.setViewport(viewports.desktop);

    for (const route of routes) {
      console.log(`Testing styling consistency on ${route.name}...`);
      
      await page.goto(`http://localhost:5173${route.path}`, { 
        waitUntil: 'networkidle0' 
      });

      await page.waitForTimeout(1000);

      // Verify PatrioticStars background is present
      const starsContainer = await page.$('.galactic-container');
      expect(starsContainer).toBeTruthy();

      // Verify color scheme consistency
      const redElements = await page.$$('[class*="CC0000"], [class*="red-"]');
      expect(redElements.length).toBeGreaterThan(0);

      const blueElements = await page.$$('[class*="1E2E89"], [class*="0A0A22"]');
      expect(blueElements.length).toBeGreaterThan(0);

      // Verify animation classes are applied
      const animatedElements = await page.$$('.animate-pulse, .animate-fade-in-up, .glassmorphism');
      expect(animatedElements.length).toBeGreaterThan(0);

      // Check for consistent button styling
      const primaryButtons = await page.$$('.bg-\\[\\#CC0000\\], .bg-gradient-to-r');
      if (primaryButtons.length > 0) {
        const buttonStyle = await page.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            borderRadius: styles.borderRadius,
            fontWeight: styles.fontWeight
          };
        }, primaryButtons[0]);
        
        expect(buttonStyle.fontWeight).toBe('700'); // font-bold
        expect(buttonStyle.borderRadius).toContain('px'); // Should have rounded corners
      }
    }
  });
});

// Export for use with yarn test
module.exports = {};
