// BOB Kitchen PIR sensor fixture - Page Object Model
class BobKitchenPir {
  constructor(page) {
    this.page = page;
    this.apiUrl = 'https://dev-functions.grtinsight.com/api/Skylink';
    this.sensorData = {
      timestamp: Date.now() / 1000, // Unix timestamp in seconds
      deviceId: "BOB Kitchen",
      client_name: "GRT Health",
      payload_type: "PIR",
      frame_type: "DETECTED_MOVEMENT",
      temp: "24",
      detection_bin_seq: "000000000000100000000000000000000000000010000000000000",
      battery: 2.7,
      dw_init: "closed at start",
      dw_inter: "closed during period",
      dw_end: "closed at end",
      light_level: 1.2,
      mvt_message_counter: Math.floor(Math.random() * 200) + 150,
      block_counter: Math.floor(Math.random() * 150) + 100
    };
  }

  // Send sensor data to API
  async sendSensorData() {
    // Update timestamp for current request
    this.sensorData.timestamp = Date.now() / 1000;
    this.sensorData.mvt_message_counter = Math.floor(Math.random() * 200) + 150;
    this.sensorData.block_counter = Math.floor(Math.random() * 150) + 100;

    const response = await this.page.request.post(this.apiUrl, {
      data: this.sensorData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status() >= 400) {
      const responseText = await response.text();
      console.log('Error response body:', responseText);
    }

    return response;
  }

  // Get sensor information
  getSensorInfo() {
    return {
      name: "BOB Kitchen PIR",
      type: "PIR",
      location: "Kitchen",
      status: "active",
      deviceId: this.sensorData.deviceId
    };
  }

  // Update sensor status
  

  // Update temperature
  

  // Update battery level
  
}

module.exports = BobKitchenPir;
