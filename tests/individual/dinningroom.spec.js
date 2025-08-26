const { test } = require('@playwright/test');
const BobDinningroomPir = require('../../Fixtures/BobDinningroomPir');

test('BOB Dinning room PIR Sensor Test', async ({ page }) => {
  const sensor = new BobDinningroomPir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Dinning room PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
