import { APIGatewayEvent, APIGatewayProxyEventQueryStringParameters, Context } from 'aws-lambda'
import { IWebhookDeliveryResponse, IWebhookDeliveryItem, SignatureHelper } from "@kentico/kontent-webhook-helper";
import { Datatype } from "./model/search-model"
import { ContentItem } from '@kentico/kontent-delivery';
import createKontentClient from "./model/kontent-client";
var _ = require('lodash');
const rqs = recombee.requests;
var recombee = require('recombee-api-client');

let log: string = "";
var objItem: { [key: string]: any } = {}
var allItems: any[] = [];

// @ts-ignore - netlify env. variable
const { RECOMBEE_API_KEY, KONTENT_SECRET } = process.env;

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

  // Empty body
  if (!event.body) {
    return { statusCode: 400, body: "Missing Data" };
  }

  const recombeeApiId = event.queryStringParameters?.apiId;

  // Consistency check - make sure your netlify environment variable and your webhook secret matches
  /*if (!event.headers['x-kc-signature'] || !SignatureHelper.isValidSignatureFromString(event.body, KONTENT_SECRET, event.headers['x-kc-signature'])) {
    return { statusCode: 401, body: "Unauthorized" };
  }*/

  const recombeeClient = new recombee.ApiClient("kontent-dev", "qi5ntzjqtWQSC2v2EjP3tfFGaNnpxqrzEGqoY5b22Y1K5MmhangeuYgLqFC3Z0Bw");
  const webhook: IWebhookDeliveryResponse = JSON.parse(event.body);

  if (webhook.message.type == "content_item_variant") {
    const operation = webhook.message.operation;
    switch (operation) {
      // publish webhook
      case "publish":
        {
          const kontentClient = createKontentClient(webhook.message.project_id);
          var properties: any[] = [];

          for (let item of webhook.data.items) {

            const contentTypeFields = await kontentClient
              .type(item.type)
              .toPromise();

            contentTypeFields.type.elements.forEach((element) => {

              log = log + "Added following properties : "
              if (Datatype.has(element.type)) {
                let codename = element.codename;
                properties.push(new rqs.AddItemProperty(codename, Datatype.get(element.type)))
                log = log + codename + ", "

                //create dynamic object 
                objItem[codename] = "";
              }
            })

            recombeeClient.send(new rqs.Batch(properties), (err: any, response: any) => {
              console.error(err);
              console.log(response);
            });          

            const response = await kontentClient.item(item.codename)
              .queryConfig({ waitForLoadingNewContent: true })
              .languageParameter(item.language)
              .toPromise();

              
            log = log + "Added following items : " + response.item.system.id

            recombeeClient.send(new rqs.SetItemValues(response.item.system.id, getValues(objItem, response.item), { cascadeCreate: true }), (err: any, res: { recomms: any; }) => {
              if (err) {
                console.log(err);
                return {
                  statusCode: 520,
                  body: JSON.stringify({ message: 'Error : ' + err }),
                };
              }
              console.log(res);
            });
          }
          return {
            statusCode: 200,
            body: `${JSON.stringify("success : " + log)}`,
          };
        }

      // unpublish webhook
      case "unpublish":
        {
          

          
          for (let item of webhook.data.items) {
            if (item.type != "post") continue;

            recombeeClient.send(new rqs.DeleteItem(item.id), (err: any, res: { recomms: any; }) => {
              if (err) {
                console.log(err);
                return {
                  statusCode: 520,
                  body: JSON.stringify({ message: 'Error : ' + err }),
                };
              }
              console.log(res);
            });
          }
          return {
            statusCode: 200,
            body: `${JSON.stringify("success : " + log)}`,
          };
        }

      default:
        return {
          statusCode: 200,
          body: `${JSON.stringify("success : " + log)}`,
        };
    }
  }
}
