const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Student Registration', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Student should log in, navigate to Find Events, and register', async () => {
    try {
      // 1. Visit Login
      await driver.get('http://localhost:3000/login');
      
      // 2. Login as Student
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      
      // ---> UPDATE THIS TO A VALID STUDENT EMAIL IN YOUR DB <---
      await emailField.sendKeys('teststudent@uwi.edu'); 
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // 3. Wait for redirect to Student Dashboard
      await driver.wait(until.urlContains('/student'), 20000); 
      await driver.sleep(2000);

      // 4. NAVIGATION: Click the "Find Events" link from your StudentLayout
      const findEventsLink = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Find Events')]")), 
        10000
      );
      await driver.executeScript("arguments[0].click();", findEventsLink);
      
      // Wait for the URL to change and give Supabase a moment to fetch the events
      await driver.wait(until.urlContains('/student/events'), 10000);
      await driver.sleep(2000); 

      // 5. Find the "E2E Beach Cleanup" event card we made in the previous test
      const eventCard = await driver.wait(
        until.elementLocated(By.xpath("//h3[contains(text(), 'E2E Beach Cleanup')]")), 
        15000
      );
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", eventCard);
      await driver.sleep(500);
      
      // Click the card (Using JS click to avoid any CSS overlap issues from the card layout)
      await driver.executeScript("arguments[0].click();", eventCard);

      // 6. Wait for the Modal to open
      await driver.wait(
        until.elementLocated(By.xpath("//h2[contains(text(), 'E2E Beach Cleanup')]")), 
        10000
      );
      await driver.sleep(1000);

      // 7. Click the "Confirm Registration" button defined in your code
      const confirmBtn = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Confirm Registration')]")), 
        10000
      );
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", confirmBtn);
      await driver.sleep(500);
      
      // Physical action click triggers the React handleRegister function
      await driver.actions().click(confirmBtn).perform();

      // 8. Handle the native Success Alert ("Successfully registered! You are projected to earn...")
      try {
        await driver.wait(until.alertIsPresent(), 10000);
        const alert = await driver.switchTo().alert();
        console.log('Registration Alert:', await alert.getText());
        await alert.accept();
      } catch (e) {
        console.log('No standard alert present.');
      }

    // 9. Verify the React state updated the main card to show the "REGISTERED" badge
      const successBadge = await driver.wait(
        until.elementLocated(By.xpath("//div[contains(@class, 'eventCard')]//span[contains(text(), 'REGISTERED') or contains(text(), 'Registered')]")), 
        10000
      );
      
      expect(successBadge).toBeDefined();
      console.log('✅ Student successfully navigated, clicked, and registered for the event!');

    } catch (error) {
      // If it fails, take a screenshot so we can see exactly where it got stuck
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('student-error-screenshot.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});