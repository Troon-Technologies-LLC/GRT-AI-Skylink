const { test } = require('@playwright/test');
const BobBathroomPir = require('../../Fixtures/BobBathroomPir');

test('BOB Bathroom PIR Sensor Test', async ({ page }) => {
  const sensor = new BobBathroomPir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Bathroom PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
