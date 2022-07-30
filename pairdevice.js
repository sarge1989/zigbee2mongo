import createMQTTClient from './common/create-client.js'
import promptSync from 'prompt-sync';

const prompt = promptSync();
let client = createMQTTClient();
client.on("connect", onConnect);


//Callbacks
function onConnect() {
    console.log("connected"); //inform on connect
    client.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": true }', { "qos": 1 }, onPermitJoin);
}

function onPermitJoin(err) {
    if (err) {
        console.log("Error occured: " + err);
        console.log("Closing client...");
        client.end();
    }
    else {
        client.subscribe("zigbee2mqtt/bridge/event", null, onSubscribe) //subscribe to MQTT topic
    }
}

function onSubscribe(err, granted) {
    if (err) {
        console.log("Error occured: " + err);
        console.log("Closing client...");
        client.end();
    }
    else {
        client.on("message", onMessage);
        console.log("You may now pair your device") //ready for pairing
    }
}

function onMessage(topic, message, packet) {
    let messageObj = JSON.parse(message)
    if (topic == "zigbee2mqtt/bridge/event" && messageObj.type == "device_interview") {
        switch (messageObj.data.status) {
            case "started":
                console.log("Device interview commencing. Please wait... (You might see this multiple times as device pairs)");
                break;
            case "failed":
                console.log("Device interview failed, please try again...")
                client.end();
                console.log("Closing client...");
                break;
            case "successful": //on pairing...
                let friendly_name = messageObj.data.friendly_name;
                let description = messageObj.data.definition.description;
                console.log(`Please input <sensorType>/<sensorName> for the ${description}. E.g. vibration/table_1`);
                let new_friendly_name = prompt("> "); //prompt for new name
                if (new_friendly_name != "") {
                    client.publish("zigbee2mqtt/bridge/request/device/rename", `{ "from": "${friendly_name}", "to": "devices/${new_friendly_name}" }`, null, onRename)
                }
        }
    }
}

function onRename(err) {
    if (err) {
        console.log("Error occured: " + err);
        console.log("Closing client...");
        client.end();
    }
    else {
        console.log("Successfully renamed!")
        client.publish("zigbee2mqtt/bridge/request/permit_join", '{ "value": false }', null, onDisallowJoin);
    }
}

function onDisallowJoin(err) {
    if (err) {
        console.log("Error occured: " + err);
        console.log("Closing client...");
        client.end();
    }
    else {
        console.log("Closing client...");
        client.end();
    }
}
