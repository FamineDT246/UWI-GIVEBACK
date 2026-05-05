// __tests__/alpha_login.test.js

const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(40000); // Increased timeout for multiple browser actions

describe('Alpha Testing (E2E): Full Login Flow', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // 1. Student Login
  test('Should log in a Student and route to /student', async () => {
    await driver.get('http://localhost:3000/login');

    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    await emailInput.sendKeys('teststudent@uwi.edu'); // Use a real test student email
    
    const passInput = await driver.findElement(By.css('input[type="password"]'));
    await passInput.sendKeys('sillygoose'); 

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();

    await driver.wait(until.urlContains('/student'), 10000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/student');
  });

  // 2. Organization Login
  test('Should log in an Organization and route to /entity', async () => {
    // Navigate back to login
    await driver.get('http://localhost:3000/login');

    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    await emailInput.sendKeys('testorg@uwi.edu'); // Use a real test org email
    
    const passInput = await driver.findElement(By.css('input[type="password"]'));
    await passInput.sendKeys('sillygoose'); 

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();

    await driver.wait(until.urlContains('/entity'), 10000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/entity');
  });

  // 3. Admin Login
  test('Should log in an Admin and route to /admin', async () => {
    await driver.get('http://localhost:3000/login');

    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    await emailInput.sendKeys('admin@uwi.edu'); // Use your real admin email
    
    const passInput = await driver.findElement(By.css('input[type="password"]'));
    await passInput.sendKeys('sillygoose'); 

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();

    await driver.wait(until.urlContains('/admin'), 10000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/admin');
  });
});