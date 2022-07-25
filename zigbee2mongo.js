import createMQTTClient from './common/create-client.js'
import dotenv from "dotenv";
import { MongoClient } from 'mongodb'

dotenv.config();

//create mongoDB connection
const connURI = process.env.MONGODB_CONNECTION_STRING;
console.log(connURI);
var mongoClient = new MongoClient(connURI);
const database = mongoClient.db('iot');
await mongoClient.connect()

let client = createMQTTClient()

//inform on connect
client.on("connect", () => console.log("connected"));

//Handle connection errors
client.on("error", (error) => {
    console.log("Can't connect" + error);
    process.exit(1);
})

//Set onMessage callback
client.on("message", onMessage)

//Subscribe to topic 
let topic = "zigbee2mqtt/devices/#"; // # wildcard subscribes to all nested topics under zigbee2mqtt/devices (we use devices to distinguish messages, the friendly name naming convention should be devices/<sensorType>/<sensorName>)
client.subscribe(topic);

//function definitions

function onMessage(topic, message, packet) { //on message, logs data to mongoDB
    let topicComponents = topic.split("/")
    let sensorType = topicComponents[2]; //assuming friendly name follows convention of devices/<sensorType>/<sensorName> (topic will have zigbee2mqtt in front)
    let sensorName = topicComponents[3]; //assuming friendly name follows convention of devices/<sensorType>/<sensorName> (topic will have zigbee2mqtt in front)
    let payload = JSON.parse(message)
    logData(sensorType, sensorName, new Date(), payload).catch(console.dir);
}

async function logData(sensorType, sensorName, timestamp, payload) { //writes the data to mongoDB
    try {
        const collection = database.collection(`${sensorType}_sensors_timeseries`);
        const document = {
            "timestamp": timestamp, //will write as UTC date - must handle coversion to SG time in application
            "sensorName": sensorName,
            "payload": payload,
        }
        await collection.insertOne(document); //insert data to mongoDB
        console.log(`Logged the following data: ${JSON.stringify(document)}`)
    } finally {

    }
}