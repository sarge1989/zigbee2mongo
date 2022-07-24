import dotenv from "dotenv";
import { MongoClient } from 'mongodb'

dotenv.config();

const connURI = process.env.MONGODB_CONNECTION_STRING;
const sensorType = "motion" //friendly name must start with "the sensor type". Edit to create new collection
const collectionName = `${sensorType}_sensors_timeseries` //create new collection for each sensor type.

async function checkAndCreateCollection() {
    try {
        var mongoClient = new MongoClient(connURI);
        const database = mongoClient.db('iot');
        let collectionExists = await database.listCollections({ name: collectionName }).hasNext()
        if (!collectionExists) {
            await database.createCollection(
                collectionName,
                {
                    timeseries: {
                        timeField: "timestamp", //eventual data must have a timestamp field.
                        metaField: "sensorName", //eventual data must have a sensorName field.
                        granularity: "minutes", //can change this to match granularity of data generation
                    },
                    expireAfterSeconds: 604800,
                }
            )
            console.log(`Collection "${collectionName}" created successfully`);
        }
        else {
            console.log(`Collection "${collectionName}" already exists.`)
        }
    } finally {
        mongoClient.close();
    }
};

checkAndCreateCollection().catch(console.dir);