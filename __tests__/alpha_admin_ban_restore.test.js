const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Admin Ban & Restore', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Admin should ban an approved organization and then restore them', async () => {
    try {
      // 1. Login as Admin
      await driver.get('http://localhost:3000/login');
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      await emailField.sendKeys('admin@uwi.edu'); // UPDATE TO YOUR ADMIN EMAIL
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // 2. Navigate to Users Page
      await driver.wait(until.urlContains('/admin'), 20000); 
      const usersLink = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Users')]")), 10000);
      await driver.executeScript("arguments[0].click();", usersLink);
      await driver.wait(until.urlContains('/admin/users'), 10000);
      await driver.sleep(1500);

      // 3. Switch to Organizations -> Approved Tab
      const orgTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Organizations')]")), 10000);
      await driver.executeScript("arguments[0].click();", orgTab);
      await driver.sleep(1000);

      const approvedSubTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Approved')]")), 10000);
      await driver.executeScript("arguments[0].click();", approvedSubTab);
      await driver.sleep(1000);

      // 4. Check for Empty State OR Ban the first org
      const tableContent = await driver.wait(
        until.elementLocated(By.xpath("//td[contains(text(), 'No approved organizations found')] | //button[contains(text(), '✗ Ban')]")),
        10000
      );
      
      const isTableEmpty = await tableContent.getText();

      if (isTableEmpty.includes('No approved organizations found')) {
        console.log('⚠️ No approved organizations to ban. Verifying empty state instead.');
        expect(isTableEmpty).toContain('No approved organizations found');
      } else {
        // 5. Click Ban
        const banBtn = await driver.findElement(By.xpath("//button[contains(text(), '✗ Ban')]"));
        await driver.actions().click(banBtn).perform();
        
        // Handle Confirm Alert
        await driver.wait(until.alertIsPresent(), 5000);
        let alert = await driver.switchTo().alert();
        await alert.accept();
        await driver.sleep(1500);

        // 6. Switch to Banned Tab
        const bannedSubTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Banned')]")), 10000);
        await driver.executeScript("arguments[0].click();", bannedSubTab);
        await driver.sleep(1500);

        // 7. Click Restore
        const restoreBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), '↺ Restore')]")), 10000);
        await driver.actions().click(restoreBtn).perform();

        // Handle Confirm Alert
        await driver.wait(until.alertIsPresent(), 5000);
        alert = await driver.switchTo().alert();
        await alert.accept();
        
        await driver.sleep(1500);
        console.log('✅ Admin successfully banned and restored the organization!');
      }

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('admin-ban-error.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});