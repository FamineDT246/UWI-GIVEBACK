const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Admin Workflow', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  test('Admin should log in, navigate to Users, and approve an organization', async () => {
    try {
      // 1. Visit Login
      await driver.get('http://localhost:3000/login');
      
      // 2. Login as Admin
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      
      // UPDATE THIS TO YOUR ADMIN EMAIL
      await emailField.sendKeys('admin@uwi.edu'); 
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      // 3. Wait for redirect to Admin Global Dashboard
      await driver.wait(until.urlContains('/admin'), 20000); 
      await driver.sleep(2000); 

      // 4. Navigate to the 'Users' page using the sidebar links in AdminLayout
      const usersLink = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Users')]")), 
        10000
      );
      await driver.executeScript("arguments[0].click();", usersLink);
      await driver.wait(until.urlContains('/admin/users'), 10000);
      await driver.sleep(2000); // Allow Supabase to fetch users

      // 5. Switch to the 'Organizations' Tab
      const orgTab = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Organizations')]")), 
        10000
      );
      await driver.executeScript("arguments[0].click();", orgTab);
      await driver.sleep(1000); // Let React swap the table

      // 6. Switch the sub-tab to 'Pending' to find accounts needing approval
      const pendingSubTab = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(text(), 'Pending')]")), 
        10000
      );
      await driver.executeScript("arguments[0].click();", pendingSubTab);
      await driver.sleep(1000);

    // 7. Wait for the table to settle. 
      // Look SPECIFICALLY for the checkmark to avoid clicking the "Approved" tab
      const tableContent = await driver.wait(
        until.elementLocated(By.xpath("//td[contains(text(), 'No pending organizations found')] | //button[contains(text(), '✓ Approve')]")),
        10000
      );

      const isTableEmpty = await tableContent.getText();

      if (isTableEmpty.includes('No pending organizations found')) {
        console.log('⚠️ No pending organizations to approve. Verifying empty state instead.');
        expect(isTableEmpty).toContain('No pending organizations found');
      } else {
        // 8. Find the ACTUAL 'Approve' action button inside the table row
        const approveBtn = await driver.findElement(By.xpath("//button[contains(text(), '✓ Approve')]"));
        
        await driver.actions().click(approveBtn).perform();
        
        // Wait for the window.confirm() popup
        await driver.wait(until.alertIsPresent(), 5000);
        const alert = await driver.switchTo().alert();
        
        console.log('Admin Confirmation Alert:', await alert.getText());
        await alert.accept();

        await driver.sleep(2000); 
        console.log('✅ Admin successfully approved the organization!');
      }

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('admin-error-screenshot.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});