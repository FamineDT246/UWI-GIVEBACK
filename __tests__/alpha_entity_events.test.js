const { Builder, By, until, Key } = require('selenium-webdriver');

jest.setTimeout(60000);

describe('Alpha Testing (E2E): Entity Event Creation', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
    await driver.manage().window().maximize();
  });

  afterAll(async () => {
    if (driver) await driver.quit();
  });

  // Unified React Field Setter
  async function setReactFieldValue(fieldName, value) {
    const field = await driver.wait(until.elementLocated(By.name(fieldName)), 10000);
    await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", field);
    await driver.sleep(500); // Give the UI a moment to settle

    const tagName = await field.getTagName();

    if (tagName.toUpperCase() === 'TEXTAREA') {
      // TEXTAREA FIX: 
      // 1. Physically click, type, and press TAB to force the browser to trigger React's onBlur/onChange.
      await driver.actions()
        .click(field)
        .pause(200)
        .sendKeys(value)
        .pause(200)
        .sendKeys(Key.TAB) 
        .perform();
        
      // 2. CRITICAL: Wait 1 second to prevent the React "Stale State" race condition.
      // This ensures formData.description is fully saved before the next field is edited.
      await driver.sleep(1000); 

    } else {
      // INPUT FIX: Use the JS Bypass that worked perfectly for your Date and Time fields
      await driver.executeScript(`
        const el = arguments[0];
        el.value = arguments[1];
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue('');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      `, field, value);
      
      await driver.sleep(400);
    }

    // Verify it stuck
    const actual = await driver.executeScript("return arguments[0].value;", field);
    if (actual !== String(value)) {
      throw new Error(`Field "${fieldName}": expected "${value}", got "${actual}"`);
    }
    console.log(`✅ ${fieldName} = "${value}"`);
  }

  test('Organization should navigate and create event', async () => {
    try {
      await driver.get('http://localhost:3000/login');
      const emailField = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
      await emailField.sendKeys('testorg@uwi.edu');
      await driver.findElement(By.css('input[type="password"]')).sendKeys('sillygoose');
      await driver.findElement(By.css('button[type="submit"]')).click();

      await driver.wait(until.urlContains('/entity'), 20000);

      const eventsLink = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Events')]")), 10000);
      await eventsLink.click();

      const createBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Create New Event')]")), 15000);
      await createBtn.click();

      await driver.wait(until.elementLocated(By.xpath("//h2[contains(text(), 'Create New Event')]")), 10000);
      await driver.sleep(2500);

     // Populate all fields - Type Description LAST to beat the React race condition
      await setReactFieldValue('title', 'E2E Beach Cleanup');
      await setReactFieldValue('start_date', '2026-07-20');
      await setReactFieldValue('start_time', '08:00');
      await setReactFieldValue('end_date', '2026-07-20');
      await setReactFieldValue('end_time', '12:00');
      await setReactFieldValue('required_volunteers', '15');
      
      // Type this absolute last so no other state updates overwrite it
      await setReactFieldValue('description', 'Automated test for SQA report documentation.');

      // Submit the form
      const publishBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Publish Event')]")), 10000);
      await driver.executeScript("arguments[0].scrollIntoView({ block: 'center' });", publishBtn);
      await driver.sleep(1000); 
      await driver.actions().click(publishBtn).perform();

      // Handle the success alert
      try {
        await driver.wait(until.alertIsPresent(), 5000);
        const alert = await driver.switchTo().alert();
        console.log('Alert:', await alert.getText());
        await alert.accept();
      } catch (e) {
        console.log('No alert present');
      }

      // Verify the modal closes
      await driver.wait(async () => {
        const els = await driver.findElements(By.xpath("//h2[contains(text(), 'Create New Event')]"));
        return els.length === 0;
      }, 10000);

      // Verify the card appears on the dashboard
      const card = await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'E2E Beach Cleanup')]")), 10000);
      expect(card).toBeDefined();
      console.log('✅ Event successfully created!');

    } catch (error) {
      const shot = await driver.takeScreenshot();
      require('fs').writeFileSync('error-screenshot.png', shot, 'base64');
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});