const { test } = require('@playwright/test');
const BobKitchenPir = require('../../Fixtures/BobKitchenPir');

test('BOB Kitchen PIR Sensor Test', async ({ page }) => {
  const sensor = new BobKitchenPir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Kitchen PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
