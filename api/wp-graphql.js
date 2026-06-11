/** Vercel serverless proxy for headless WordPress WPGraphQL (avoids browser CORS). */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const endpoint = process.env.WORDPRESS_GRAPHQL_URL;
  if (!endpoint) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "WordPress GraphQL is not configured" }));
    return;
  }

  let body = "";
  if (req.method === "POST") {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  } else {
    const query = req.query?.query;
    const variables = req.query?.variables;
    if (!query) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing GraphQL query" }));
      return;
    }
    body = JSON.stringify({
      query,
      variables: variables ? JSON.parse(variables) : undefined,
    });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.end(text);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "WordPress GraphQL unreachable", detail: String(error.message || error) }));
  }
};
