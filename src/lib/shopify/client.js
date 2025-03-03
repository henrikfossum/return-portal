// src/lib/shopify/client.js
import { shopifyApi, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-01';
import '@shopify/shopify-api/adapters/node';

// Create a client factory that can be used to create clients for different stores
export function createShopifyClient(config) {
  const {
    apiKey = process.env.SHOPIFY_API_KEY,
    apiSecret = process.env.SHOPIFY_API_SECRET,
    accessToken = process.env.SHOPIFY_ACCESS_TOKEN,
    shopDomain = process.env.SHOPIFY_SHOP_DOMAIN,
    apiVersion = '2024-01',
  } = config;

  // Validate required parameters
  if (!apiKey || !apiSecret || !accessToken || !shopDomain) {
    throw new Error('Missing required Shopify configuration parameters');
  }

  // Create the Shopify API instance
  const shopify = shopifyApi({
    apiKey,
    apiSecretKey: apiSecret,
    scopes: ['read_orders', 'write_orders'],
    hostName: shopDomain.replace(/^https?:\/\//, ''),
    apiVersion,
    isPrivateApp: true,
    restResources,
  });

  // Create a session
  const session = new Session({
    id: `${shopDomain}-session`,
    shop: shopDomain.replace(/^https?:\/\//, ''),
    state: 'active',
    isOnline: false,
  });

  // Set the access token
  session.accessToken = accessToken;

  // Create a REST client
  const client = new shopify.clients.Rest({ session });

  // Create a GraphQL client
  const graphqlClient = new shopify.clients.Graphql({ session });

  return {
    rest: client,
    graphql: graphqlClient,
    session,
    shopify,
  };
}

// For backward compatibility and easy usage in the demo
const defaultClient = createShopifyClient({});

export const { rest: client, graphql: graphqlClient } = defaultClient;

// Future multi-tenant support
const clientCache = new Map();

export async function getShopifyClientForTenant(tenantId = 'default') {
  // Check if we have a cached client
  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId);
  }

  // For the demo, just return the default client
  if (tenantId === 'default') {
    clientCache.set('default', defaultClient);
    return defaultClient;
  }

  // In the future, we would look up the tenant's configuration from a database
  // const tenantConfig = await database.getTenantConfig(tenantId);
  // const client = createShopifyClient(tenantConfig);
  // clientCache.set(tenantId, client);
  // return client;

  // For now, return the default client
  clientCache.set(tenantId, defaultClient);
  return defaultClient;
}

