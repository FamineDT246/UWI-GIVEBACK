// __tests__/alpha_signup.test.js

const { Builder, By, until } = require('selenium-webdriver');

jest.setTimeout(60000); 

describe('Alpha Testing (E2E): Registration Flow for Core Users', () => {
  let driver;

  beforeAll(async () => {
    driver = await new Builder().forBrowser('chrome').build();
  });

  afterAll(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  // The Exact User Data to Inject
  const testUsers = [
    { type: 'student', name: 'Jessica', id: '816000001', email: 'jessica.student@uwi.edu', phone: '246-555-0101', pass: 'sillygoose' },
    { type: 'org', name: 'Jessica (Org)', contact: 'Jessica', email: 'jessica.org@uwi.edu', phone: '246-555-0102', pass: 'sillygoose' },
    { type: 'student', name: 'Sharina', id: '816000002', email: 'sharina.student@uwi.edu', phone: '246-555-0201', pass: 'sillygoose' },
    { type: 'org', name: 'Sharina (Org)', contact: 'Sharina', email: 'sharina.org@uwi.edu', phone: '246-555-0202', pass: 'sillygoose' },
    { type: 'student', name: 'Jaidon', id: '816000003', email: 'jaidon.student@uwi.edu', phone: '246-555-0301', pass: 'sillygoose' },
    { type: 'org', name: 'Jaidon (Org)', contact: 'Jaidon', email: 'jaidon.org@uwi.edu', phone: '246-555-0302', pass: 'sillygoose' }
  ];

  // Loop through the array and dynamically generate a test for each user
  testUsers.forEach((user) => {
    test(`Should register ${user.type === 'student' ? 'Student' : 'Organization'}: ${user.email}`, async () => {
      
      // 1. Reset the route for a clean form state
      await driver.get('http://localhost:3000/register'); 

      // 2. Select the correct tab based on user type
      if (user.type === 'student') {
        const studentTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'I am a Student')]")), 5000);
        await studentTab.click();
      } else {
        const orgTab = await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'I am an Organization')]")), 5000);
        await orgTab.click();
      }

      // Give React a fraction of a second to render the correct input fields
      await driver.sleep(500); 

      // 3. Grab all inputs and fill them out
      const inputs = await driver.findElements(By.css('input'));
      
      if (user.type === 'student') {
        await inputs[0].sendKeys(user.name);      // Full Name
        await inputs[1].sendKeys(user.id);        // UWI Student ID
        await inputs[2].sendKeys(user.email);     // Official Email
        await inputs[3].sendKeys(user.phone);     // Phone Number
        await inputs[4].sendKeys(user.pass);      // Password
      } else {
        await inputs[0].sendKeys(user.name);      // Organization Name
        await inputs[1].sendKeys(user.contact);   // Contact Person
        await inputs[2].sendKeys(user.email);     // Official Email
        await inputs[3].sendKeys(user.phone);     // Phone Number
        await inputs[4].sendKeys(user.pass);      // Password
      }

      // 4. Click Sign Up
      const submitBtn = await driver.findElement(By.xpath("//button[contains(., 'Sign Up')]"));
      await submitBtn.click();

      // 5. Verify successful routing BACK to the login page
      await driver.wait(until.urlContains('/login'), 10000);
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/login');
    });
  });
});