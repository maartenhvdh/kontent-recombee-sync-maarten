import { APIGatewayEvent, Context } from 'aws-lambda'
import { SearchProjectConfiguration, Datatype } from "./model/search-model"
import createKontentClient from "./model/kontent-client";
import { ContentItem } from '@kentico/kontent-delivery';
var _ = require('lodash');
var recombee = require('recombee-api-client');
var rqs = recombee.requests;
var objItem: { [key: string]: any } = {}
var allItems: any[] = [];

// @ts-ignore - netlify env. variable
const { RECOMBEE_API_KEY } = process.env;

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

function getValues(items: { [key: string]: any }, item: ContentItem) {
  //Dynamically add all values 
  Object.keys(items).forEach(function (key) {
    if (key == "asset") {
      items[key] = item[key]?.value.map((i: { url: any; }) => i.url)
    }
    else {
      items[key] = item[key]?.value
    }
  });

  //Add values for system fields
  items["codename"] = item.system.codename;
  items["language"] = item.system.language;
  items["last_updated"] = item.system.lastModified;

  //Clone object and add to allItems
  var newItem: { [key: string]: any } = {}
  newItem = _.clone(items)
  allItems.push(newItem);

  return allItems[allItems.length - 1];
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
  const kontentClient = createKontentClient(config.kontent.projectId);
  const recombeeClient = new recombee.ApiClient(config.recombee.appId, config.recombee.apiKey);

  //Get all element type of content type  and add them as propery field  to Recombee
  const contentTypeFields = await kontentClient
    .type(config.kontent.contentType)
    .toPromise();

  //Get all content value of content type and add them as items to Recombee
  const contentItems = await kontentClient.items()
    .type(config.kontent.contentType)
    .toPromise();

  //Create dynamic object with field properties of specific content type  
  var properties: any[] = [];

  //Add system fields as properties to Recombee
  properties.push(new rqs.AddItemProperty("codename", "string"))
  properties.push(new rqs.AddItemProperty("language", "string"))
  properties.push(new rqs.AddItemProperty("last_updated", "timestamp"))

  contentTypeFields.type.elements.forEach((element) => {
    if (Datatype.has(element.type)) {
      let codename = element.codename;
      properties.push(new rqs.AddItemProperty(codename, Datatype.get(element.type)))

      //create dynamic object 
      objItem[codename] = "";
    }
  }) 

  recombeeClient.send(new rqs.Batch(properties), (err: any, res: { recomms: any; }) => {
    if (err) {
      console.log(err);
      return {
        statusCode: 520,
        body: JSON.stringify({ message: 'Error : ' + err }),
      };
    }    
    console.log(res);
    var itemvalues: any[] = [];
      contentItems.items.forEach((item) => {
      console.log(item)
        console.log(item.system.id)
        itemvalues.push(new rqs.SetItemValues(item.system.id, getValues(objItem, item), { cascadeCreate: true }),
        );
      })

      recombeeClient.send(new rqs.Batch(itemvalues), (err: any, res: { recomms: any; }) => {
        if (err) {
          console.log(err);
          return {
            statusCode: 520,
            body: JSON.stringify({ message: 'Error : ' + err }),
          };
        }
        console.log(res);
      });
  });
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' }),
  };
};
