// __tests__/alpha_signup.test.js

const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(40000); 

describe('Alpha Testing (E2E): Registration Flow', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // Generate random emails to bypass Supabase's "Email already registered" block
  const randomNum = Math.floor(Math.random() * 10000);
  const studentEmail = `newstudent${randomNum}@uwi.edu`;
  const orgEmail = `neworg${randomNum}@charity.org`;

  test('Should register a new Student and route back to /login for approval', async () => {
    // 1. Hit the correct route
    await driver.get('http://localhost:3000/register'); 

    // 2. Click the "I am a Student" tab
    const studentTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'I am a Student')]")), 5000);
    await studentTab.click();

    // Give the UI a tiny fraction of a second to render the correct fields
    await driver.sleep(500); 

    // 3. Grab all inputs on the screen and fill them out in top-to-bottom order
    const inputs = await driver.findElements(By.css('input'));
    
    await inputs[0].sendKeys('E2E Test Student'); // Full Name
    await inputs[1].sendKeys('816000000');        // UWI Student ID
    await inputs[2].sendKeys(studentEmail);       // Official Email
    await inputs[3].sendKeys('246-555-0101');     // Phone Number
    await inputs[4].sendKeys('TestPass123!');     // Password

    // 4. Click Sign Up
    const submitBtn = await driver.findElement(By.xpath("//button[contains(., 'Sign Up')]"));
    await submitBtn.click();

    // 5. Verify successful routing BACK to the login page
    await driver.wait(until.urlContains('/login'), 10000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/login');
  });

  test('Should register a new Organization and route back to /login for approval', async () => {
    // 1. Reset back to the register page
    await driver.get('http://localhost:3000/register');

    // 2. Click the "I am an Organization" tab
    const orgTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'I am an Organization')]")), 5000);
    await orgTab.click();

    await driver.sleep(500); 

    // 3. Grab inputs and fill them out for the Organization fields
    const inputs = await driver.findElements(By.css('input'));
    
    await inputs[0].sendKeys('E2E Test Organization'); // Organization Name
    await inputs[1].sendKeys('Jane Doe');              // Contact Person
    await inputs[2].sendKeys(orgEmail);                // Official Email
    await inputs[3].sendKeys('246-555-0202');          // Phone Number
    await inputs[4].sendKeys('TestPass123!');          // Password

    // 4. Click Sign Up
    const submitBtn = await driver.findElement(By.xpath("//button[contains(., 'Sign Up')]"));
    await submitBtn.click();

    // 5. Verify successful routing BACK to the login page
    await driver.wait(until.urlContains('/login'), 10000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/login');
  });
});