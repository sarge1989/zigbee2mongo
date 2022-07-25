# Zigbee2Mongo

Project to get Zigbee IOT device data through to MongoDB via MQTT.

## Hardware
List of hardware used for the project
 - [Raspberry Pi 4 Model B 4gb with Argon M2 Kit](https://shopee.sg/%F0%9F%94%A5-Raspberry-Pi-4-model-b-1gb-2gb-4gb-8gb-kit-argon-i.276775767.12907766090)
 - [Lexar NM100M2 SATA 256gb](https://www.lazada.sg/products/lexar-nm100-m2-2280-sata-6gbs-ssd-128gb-256gb-512gb-i339962723-s752972269.html?)
 - [SONOFF ZBDongle-P Zigbee 3.0 USB Dongle Plus](https://www.lazada.sg/products/i2089190309-s11597813233.html)
 - [USB Extension Cable](https://www.amazon.sg/UGREEN-Extension-Extender-Transfer-Playstation/dp/B00P0ES0YE)

## Installation
### Set Up Raspberry Pi Server

 1. Set up Raspberry Pi as per instructions in box
 2. [Set up SSD and get the Raspberry Pi to boot from it](%28https://www.the-diy-life.com/how-to-boot-a-raspberry-pi-4-from-an-ssd/)
     - Need to use [third party tool](https://www.diskpart.com/articles/format-usb-flash-drive-to-fat32-0310.html) to format SSD to FAT32 as this wasn't possible on Windows
 3. [Set static IP for Raspberry Pi](https://www.makeuseof.com/raspberry-pi-set-static-ip/)
 4. [Set up remote SSH from VS Code](https://www.raspberrypi.com/news/coding-on-raspberry-pi-remotely-with-visual-studio-code/) for headless operation
 5. Connect the SONOFF Dongle to the Raspberry Pi
 6. Take note of the RASPBERRY_PI_USERNAME, which is the name on the bash terminal ("sarge" in example below).
  
    `sarge@raspberrypi:~ $`

### Set Up Mosquitto

 6. [Install Mosquitto](https://randomnerdtutorials.com/how-to-install-mosquitto-broker-on-raspberry-pi/) 
     - Step 6 didn't work for me when installing via VSCode SSH as install location of mosquitto, `/user/sbin`, wasn't in PATH. But Mosquitto was installed correctly in any case.
     - I used remote access (no authentication) 

### Set Up Zigbee2MQTT
7. Find the USB_DEVICE_ID. In the example below, the ID is `usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_b40db0772913ec11949321c7bd930c07-if00-port0`
   ```
   sarge@raspberrypi:~ $ ls -l /dev/serial/by-id
   total 0
   lrwxrwxrwx 1 root root 13 Jul 23 11:17 usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_b40db0772913ec11949321c7bd930c07-if00-port0 -> ../../ttyUSB0
   ```
8. Install Zigbee2MQTT as per the [installing section](https://www.zigbee2mqtt.io/guide/installation/01_linux.html#installing)

9. Configure Zigbee2MQTT as per the [configure section](https://www.zigbee2mqtt.io/guide/installation/01_linux.html#configuring)
   - Use these configs instead. Note the fields in angle brackets to replace with your own values
     ```
     # MQTT settings
     mqtt:
       # MQTT base topic for Zigbee2MQTT MQTT messages
       base_topic: zigbee2mqtt
       # MQTT server URL
       server: 'mqtt://localhost'

     # Serial settings
     serial:
       # Location of the adapter
       port: <USB_DEVICE_ID> #from step 7
     advanced:
       network_key: GENERATE
     ```
10. [Start Zigbee2MQTT](https://www.zigbee2mqtt.io/guide/installation/01_linux.html#starting-zigbee2mqtt)
11. [Run Zigbee2MQTT as daemon (in background) and start it automatically on boot](un%20Zigbee2MQTT%20as%20daemon%20%28in%20background%29%20and%20start%20it%20automatically%20on%20boot)
    - Repace `User=pi` with <RASPBERRY_PI_USERNAME> (ref step 5)

## Usage

### Repo Setup
1. Clone the repo
   ```
   git -clone https://github.com/sarge1989/zigbee2mongo.git
   ```
2. Install repositories
   ```
   npm install
   ```

### Adding a new device
Run pairdevice.js in a new terminal to add a new device. 
```
node pairdevice.js
```
Key in the /\<sensorType>/\<sensorName> when prompted, e.g. `vibration\vibration_0`. The script will append the "device" to the friendly_name automatically. Refer to next section on naming convention.

### Naming Convention
Devices should have a friendly_name of devices/\<sensorType>/\<sensorName>. This is so that the MongoDB logger can subscribe to topic `zigbee2mqtt/devices` only, to only receive messages sent by the IOT devices, and not the many messages sent by zigbee2mqtt's other functions. The sensorType will be used to distinguish the MongoDB collection - there will be 1 collection for each sensor type.

### Creating a new collection
There should be one collection per sensorType. To create a new collection (if you're adding a new sensorType), do the following:
1. If not already done, create a .env file in the root folder, with your own MongoDB connection string.
   ```
   MONGODB_CONNECTION_STRING=<YOUR MONGO DB CONNECTION STRING>
   ```
2. Edit line 7 in create-new-collection.js to reflect your new sensorType.
   ```
   const sensorType = "motion" //friendly name must start with "the sensor type". Edit to create new collection
   ```
3. Run create-new-collection.js in a new terminal to create a new collection.
   ```
   node create-new-collection.js
   ```
### Logging Data
1. If not already done, create a .env file in the root folder, with your own MongoDB connection string.
   ```
   MONGODB_CONNECTION_STRING=<YOUR MONGO DB CONNECTION STRING>
   ```
2. Run zigbee2mongo.js
   ```
   node zigbee2mongo.js
   ```

### Running Logging Program On Boot via Systemd
1. Create a systemctl configuration file for zigbee2mongo
   ```
   # Create a systemctl configuration file for Zigbee2MQTT
   sudo nano /etc/systemd/system/zigbee2mongo.service
   ```
2. Add the following to the file
   ```
   [Unit]
   Description=zigbee2mqtt.js - sends zigbee data to mongodb via mqtt bridge
   Documentation=https://github.com/sarge1989/zigbee2mongo
   After=zigbee2mqtt.service

   [Service]
   Type=simple
   User= <RASPBERRY_PI_USERNAME> 
   #take note to change this
   ExecStart=/usr/bin/node <ABSOLUTE_PATH_TO_WORKING_DIRECTORY>/zigbee2mongo.js
   Restart=always
   WorkingDirectory=<ABSOLUTE_PATH_TO_WORKING_DIRECTORY>
   RestartSec=10s

   [Install]
   WantedBy=multi-user.target
   ```
3. Start zigbee2mongo via systemctl
   ```
   sudo systemctl start zigbee2mongo
   ```
4. Check status
   ```
   systemctl status zigbee2mongo
   ```
5. If all is working fine, enable automatic launch on boot
   ```
   sudo systemctl enable zigbee2mongo
   ```
