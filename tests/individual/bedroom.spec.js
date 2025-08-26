const { test } = require('@playwright/test');
const BobBedroomPir = require('../../Fixtures/BobBedroomPir');

test('BOB Washroom PIR Sensor Test', async ({ page }) => {
  const sensor = new BobBedroomPir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Washroom PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
