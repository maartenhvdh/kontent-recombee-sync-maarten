type KontentConfiguration = {
  projectId: string,
  language?: string,
  contentType: string
}

type RecombeeConfiguration = {
  appId: string,
  apiKey?: string
}

type SearchProjectConfiguration = {
  kontent: KontentConfiguration,
  recombee: RecombeeConfiguration
}

let Datatype = new Map();
Datatype.set("text", "string");
Datatype.set("rich_text", "string");
Datatype.set("asset", "imageList");
Datatype.set("number", "int");
Datatype.set("date_time", "timestamp");

export { SearchProjectConfiguration, RecombeeConfiguration, KontentConfiguration, Datatype }