import { APIGatewayEvent, Context } from 'aws-lambda'
import { SearchProjectConfiguration, Datatype } from "./model/search-model"
var recombee = require('recombee-api-client');
var rqs = recombee.requests;

function getConfiguration(body: string): SearchProjectConfiguration {
  const jsonBody = JSON.parse(body);
  const config: SearchProjectConfiguration = {
    kontent: {
      projectId: jsonBody.projectId,
      language: jsonBody.language,
      contentType: jsonBody.contentType
    },
    recombee: {
      appId: jsonBody.appId,
      apiKey: jsonBody.apiKey,
    }
  };
  return config;
}

/* FUNCTION HANDLER */
export async function handler(event: APIGatewayEvent, context: Context) {

  // Only receiving POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!event.body)
    return { statusCode: 200, body: [] };

  //Get config and setup client for Kontent and Recombee  
  const config = getConfiguration(event.body);

  
  var client = new recombee.ApiClient(config.recombee.appId, config.recombee.apiKey);

  console.log(client)
  console.log(config.recombee.appId)
  console.log(config.recombee.apiKey)

   console.log("start call")  

   var callback  = function (err: any, res: { recomms: any; }) {
    if(err) {
      console.log("callback")  
      console.log(err);
      // use fallback ...
      return;
    }
    console.log(res.recomms);
  }
  
  // Get 5 recommendations for user-13434
  client.send(new rqs.AddItemProperty("codename", "string"), callback);

  console.log("end call")

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' }),
  };
};