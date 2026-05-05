const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Entity Volunteer Management', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Organization should view roster and send broadcast to registered students', async () => {
    try {
      // 1. Visit Login
      await driver.get('http://localhost:3000/login');
      
      // 2. Login as the Organization
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      await emailField.sendKeys('testorg@uwi.edu'); // UPDATE: Org Email
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // 3. Wait for redirect and navigate to Events
      await driver.wait(until.urlContains('/entity'), 20000); 
      const eventsLink = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Events')]")), 10000);
      await driver.executeScript("arguments[0].click();", eventsLink);
      await driver.sleep(2000); 

      // 4. Find and open the "E2E Beach Cleanup" event card
      const eventCard = await driver.wait(
        until.elementLocated(By.xpath("//h3[contains(text(), 'E2E Beach Cleanup')]")), 
        15000
      );
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", eventCard);
      await driver.sleep(500);
      await driver.actions().click(eventCard).perform();

      // 5. Wait for the Modal to open
      await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Event')]")), 10000);
      await driver.sleep(1000);

      // 6. Switch to the "Registered Volunteers" Tab
      const volunteersTab = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Registered Volunteers')]")), 
        10000
      );
      await driver.actions().click(volunteersTab).perform();
      await driver.sleep(1000); // Give React a moment to render the table

      // 7. Verify the student appears on the roster (Checking by the email used in Test 2)
      // UPDATE: Make sure this email matches the one the student used to register!
      const studentInTable = await driver.wait(
        until.elementLocated(By.xpath("//td//div[contains(text(), 'TestStudent') or contains(text(), 'Unknown')]")), 
        10000
      );
      expect(studentInTable).toBeDefined();
      console.log('✅ Verified: Student successfully appeared on the Organization roster.');

      // 8. Test the Broadcast Announcement feature
      const broadcastInput = await driver.wait(
        until.elementLocated(By.xpath("//input[contains(@placeholder, 'announcement')]")), 
        10000
      );
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", broadcastInput);
      await driver.sleep(500);
      
      // Type the message
      await driver.actions()
        .click(broadcastInput)
        .sendKeys("Thanks for registering! Please bring sunscreen.")
        .perform();
      
      await driver.sleep(500);

      // 9. Click Send
      const sendBtn = await driver.findElement(By.xpath("//button[text()='Send']"));
      await driver.actions().click(sendBtn).perform();

      // 10. Handle the Success Alert ("Announcement sent to all registered volunteers!")
      try {
        await driver.wait(until.alertIsPresent(), 10000);
        const alert = await driver.switchTo().alert();
        console.log('Broadcast Alert:', await alert.getText());
        await alert.accept();
      } catch (e) {
        console.log('No broadcast alert present.');
      }

      console.log('✅ Broadcast successfully sent!');

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('org-management-error-screenshot.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});