const { test } = require('@playwright/test');
const BobOfficePir = require('../../Fixtures/BobOfficePir');

test('BOB Office PIR Sensor Test', async ({ page }) => {
  const sensor = new BobOfficePir(page);
  const response = await sensor.sendSensorData();
  
  console.log('Office PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
