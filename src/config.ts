import * as dotenv from 'dotenv';

dotenv.config();


export const app = {
  namespace: process.env['STORE_APPS_NAMESPACE'] || 'app.deresute.store.tracker',
  apis: {
    port: process.env['STORE_APIS_PORT'] || '8080',
  },
  apps: {
    appstore: process.env['STORE_APPS_APPSTORE'] || '',
    playstore: process.env['STORE_APPS_PLAYSTORE'] || '',
  },
  kafka: {
    bootstrap: process.env['STORE_KAFKA_BOOSTRAP'] || '',
    topic: {
      schedule: {
        name: process.env['STORE_KAFKA_SCHEDULE_TOPIC_NAME'] || '',
        replication: process.env['STORE_KAFKA_SCHEDULE_TOPIC_REPLICATION'] || '1',
      },
      versionEvent: {
        name: process.env['STORE_KAFKA_VERSIONEVENT_TOPIC_NAME'] || '',
        replication: process.env['STORE_KAFKA_VERSIONEVENT_TOPIC_REPLICATION'] || '1',
      },
    },
  },
  mongo: {
    uri: process.env['STORE_MONGODB_URI'] || '',
  }
};


export const checkRequiredConfig = () : boolean => {

  if(!app.apps.appstore && !app.apps.playstore) {
    throw new Error("Must specific at least one app to track")
  }

  if(!app.kafka.bootstrap || !app.kafka.topic.schedule.name) {
    throw new Error("Kafka is required in order to execute update tasks")
  }

  if(!app.mongo.uri) {
    throw new Error("MongoDB is required to store the information")
  }

  return true;
}

export const isVersionNotifiationEnabled = () : boolean => {
  if(!app.kafka.topic.versionEvent.name) {
    return false;
  }
  return true;
}