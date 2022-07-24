import * as mqtt from "mqtt"  // import everything inside the mqtt module and give it the namespace "mqtt"

export default function createMQTTClient() {
    let client = mqtt.connect('mqtt://localhost');
    return client;
};