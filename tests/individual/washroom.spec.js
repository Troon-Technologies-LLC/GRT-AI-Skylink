const { test } = require('@playwright/test');
const BobWashroomPir = require('../../Fixtures/BobWashroomPir');

test('BOB Washroom PIR Sensor Test', async ({ page }) => {
  const sensor = new BobWashroomPir(page);
  const response = await sensor.sendSensorData();

  console.log('Washroom PIR Response Status:', response.status());
  console.log('Sensor Info:', sensor.getSensorInfo());
});
