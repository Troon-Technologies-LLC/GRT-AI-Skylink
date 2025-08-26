// BOB Dinning room DOOR sensor fixture - Page Object Model
class BobDinningroomDoor {
  constructor(page) {
    this.page = page;
    this.apiUrl = 'https://dev-functions.grtinsight.com/api/Skylink';
    this.sensorData = {
      timestamp: Date.now() / 1000, // Unix timestamp in seconds
      deviceId: "BOB Dinning room",
      client_name: "GRT Health",
      payload_type: "DOOR",
      frame_type: "DOOR_OPENED",
      temp: "20",
      detection_bin_seq: "00000000000000000000001000000000000000000000000000000",
      battery: 2.9,
      dw_init: "closed at start",
      dw_inter: "opened during period",
      dw_end: "closed at end",
      light_level: 0.0,
      mvt_message_counter: 0, // Not applicable for door sensors
      block_counter: Math.floor(Math.random() * 150) + 100
    };
  }

  // Send sensor data to API
  async sendSensorData() {
    // Update timestamp for current request
    this.sensorData.timestamp = Date.now() / 1000;
    this.sensorData.block_counter = Math.floor(Math.random() * 150) + 100;

    // Randomly set door state
    const doorStates = ["DOOR_OPENED", "DOOR_CLOSED"];
    this.sensorData.frame_type = doorStates[Math.floor(Math.random() * doorStates.length)];

    // Update door window states based on frame type
    if (this.sensorData.frame_type === "DOOR_OPENED") {
      this.sensorData.dw_inter = "opened during period";
      this.sensorData.dw_end = "opened at end";
    } else {
      this.sensorData.dw_inter = "closed during period";
      this.sensorData.dw_end = "closed at end";
    }

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
      name: "BOB Dinning room DOOR",
      type: "DOOR",
      location: "Dinning room",
      status: "active",
      deviceId: this.sensorData.deviceId
    };
  }

  // Update sensor status
  updateFrameType(frameType) {
    this.sensorData.frame_type = frameType;
  }

  // Update temperature
  updateTemperature(temp) {
    this.sensorData.temp = temp.toString();
  }

  // Update battery level
  updateBattery(batteryLevel) {
    this.sensorData.battery = batteryLevel;
  }

  // Set door state
  setDoorState(isOpen) {
    this.sensorData.frame_type = isOpen ? "DOOR_OPENED" : "DOOR_CLOSED";
    this.sensorData.dw_inter = isOpen ? "opened during period" : "closed during period";
    this.sensorData.dw_end = isOpen ? "opened at end" : "closed at end";
  }
}

module.exports = BobDinningroomDoor;
