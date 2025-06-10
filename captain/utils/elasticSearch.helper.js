const { Client } = require('@elastic/elasticsearch');

require("dotenv").config();

const client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  }
});


async function indexDocument(indexName, id, document) {
  try {
    const response = await client.index({
      index: indexName,
      id: id.toString(),
      document,
    });
    console.log(`Indexed into ${indexName}:`, response);
  } catch (err) {
    console.log(`Elastic Insert Error (${indexName}): ${err}`);
  }
}

async function updateDocument(indexName, id, document) {
  try {
    const response = await client.update({
      index: indexName,
      id: id.toString(),
      doc: document,
    });
    console.log(`Updated in ${indexName}:`, response);
  } catch (err) {
    console.log(`Elastic Update Error (${indexName}): ${err}`);
  }
}

async function deleteDocument(indexName, id) {
  try {
    const response = await client.delete({
      index: indexName,
      id: id.toString(),
    });
    console.log(`Deleted from ${indexName}:`, response);
  } catch (err) {
    console.log(`Elastic Delete Error (${indexName}): ${err}`);
  }
}

async function getDocument(indexName, id) {
  if (id) {
    try {
      const response = await client.get({
        index: indexName,
        id: id.toString(),
      });
      console.log(`Fetched from ${indexName}:`, response);
      return response._source;
    } catch (err) {
      console.log(`Elastic Get Error (${indexName}): ${err}`);
    }
  } else {
    try {
      const response = await client.search({
        index: indexName
      });
      console.log(`Fetched from ${indexName}:`, response);
      return response.hits.hits.map(hit => hit._source);
    } catch (err) {
      console.log(`Elastic Get Error (${indexName}): ${err}`);
    }
  }
}


module.exports = {
  indexDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  client
};
