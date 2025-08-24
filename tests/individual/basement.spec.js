const { test } = require('@playwright/test');
const BobBasementDoor = require('../../Fixtures/BobBasementDoor');

test('BOB Basement DOOR Sensor Test', async ({ page }) => {
  const sensor = new BobBasementDoor(page);
  const response = await sensor.sendSensorData();
  
  console.log('Basement DOOR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
