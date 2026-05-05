const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Teardown & Deletion', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Organization should cancel and permanently delete the test event', async () => {
    try {
      // 1. Visit Login
      await driver.get('http://localhost:3000/login');
      
      // 2. Login as the Organization
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      await emailField.sendKeys('testorg@uwi.edu'); 
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

      // 5. Wait for Modal to open, then click "Cancel Event"
      await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Event')]")), 10000);
      await driver.sleep(1000);

      const cancelEventBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Cancel Event')]"));
      await driver.actions().click(cancelEventBtn).perform();

      // 6. Handle the browser window.confirm() popup
      await driver.wait(until.alertIsPresent(), 5000);
      let alert = await driver.switchTo().alert();
      await alert.accept();

      // Handle the secondary success alert ("Event cancelled, volunteers notified...")
      await driver.wait(until.alertIsPresent(), 5000);
      alert = await driver.switchTo().alert();
      await alert.accept();

      // 7. Wait for modal to close automatically
      await driver.sleep(1500);

      // 8. Switch to the "Cancelled Events" Tab
      const cancelledTab = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Cancelled Events')]")), 
        10000
      );
      await driver.executeScript("arguments[0].click();", cancelledTab);
      await driver.sleep(1500); // Give React time to swap the lists

      // 9. Find the card again in the Cancelled list and click it
      const cancelledCard = await driver.wait(
        until.elementLocated(By.xpath("//h3[contains(text(), 'E2E Beach Cleanup')]")), 
        10000
      );
      await driver.actions().click(cancelledCard).perform();

      // 10. Wait for Modal, then click "Permanently Delete"
      await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'View Cancelled Event')]")), 10000);
      await driver.sleep(1000);

      const deleteBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Permanently Delete')]"));
      await driver.actions().click(deleteBtn).perform();

      // 11. Handle the browser window.confirm() popup
      await driver.wait(until.alertIsPresent(), 5000);
      alert = await driver.switchTo().alert();
      await alert.accept();

      // Handle the secondary success alert ("Event permanently deleted...")
      await driver.wait(until.alertIsPresent(), 5000);
      alert = await driver.switchTo().alert();
      await alert.accept();

      // 12. Verify the modal closed and the event is gone
      await driver.sleep(1500);
      const remainingCards = await driver.findElements(By.xpath("//h3[contains(text(), 'E2E Beach Cleanup')]"));
      
      expect(remainingCards.length).toBe(0);
      console.log('✅ Teardown Complete: Event successfully cancelled and wiped from the database!');

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('teardown-error-screenshot.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});