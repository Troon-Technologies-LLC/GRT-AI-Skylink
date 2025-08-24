const { test } = require('@playwright/test');
const BobLivingroomPir = require('../../Fixtures/BobLivingroomPir');

test('BOB Livingroom PIR Sensor Test', async ({ page }) => {
  const sensor = new BobLivingroomPir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Livingroom PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
