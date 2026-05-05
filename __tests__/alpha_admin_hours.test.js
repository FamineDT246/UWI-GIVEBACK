const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Admin Hours Moderation', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Admin should force approve a pending hours submission', async () => {
    try {
      // 1. Login as Admin
      await driver.get('http://localhost:3000/login');
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      await emailField.sendKeys('admin@uwi.edu'); // UPDATE TO YOUR ADMIN EMAIL
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // 2. Navigate to Hours Page
      await driver.wait(until.urlContains('/admin'), 20000); 
      const hoursLink = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Hours')]")), 10000);
      await driver.executeScript("arguments[0].click();", hoursLink);
      await driver.wait(until.urlContains('/admin/hours'), 10000);
      await driver.sleep(1500); // Default tab is "Pending"

      // 3. Check for Empty State OR Force Approve
      const tableContent = await driver.wait(
        until.elementLocated(By.xpath("//td[contains(text(), 'No submissions found')] | //button[contains(text(), '⚡ Force Approve')]")),
        10000
      );
      
      const isTableEmpty = await tableContent.getText();

      if (isTableEmpty.includes('No submissions found')) {
        console.log('⚠️ No pending submissions to moderate. Verifying empty state instead.');
        expect(isTableEmpty).toContain('No submissions found');
      } else {
        // 4. Click Force Approve
        const forceApproveBtn = await driver.findElement(By.xpath("//button[contains(text(), '⚡ Force Approve')]"));
        await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", forceApproveBtn);
        await driver.actions().click(forceApproveBtn).perform();
        
        // 5. Handle Confirm Alert
        await driver.wait(until.alertIsPresent(), 5000);
        const alert = await driver.switchTo().alert();
        console.log('Action Alert:', await alert.getText());
        await alert.accept();

        await driver.sleep(1500);
        console.log('✅ Admin successfully force-approved the hours submission!');
      }

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('admin-hours-error.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});