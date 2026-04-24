const ALLOWED_METHODS = "GET,POST,PUT,OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

function parseAllowedOrigins(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function corsHeaders(origin, env) {
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (!origin || !allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function isAllowedPath(pathname) {
  return (
    pathname === "/healthz" ||
    pathname === "/readyz" ||
    pathname === "/metrics" ||
    pathname.startsWith("/v1/")
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!env.ORIGIN_API_BASE_URL) {
      return jsonResponse({ error: "ORIGIN_API_BASE_URL is not configured" }, 500, cors);
    }

    if (!isAllowedPath(url.pathname)) {
      return jsonResponse({ error: "Not found" }, 404, cors);
    }

    const originBase = env.ORIGIN_API_BASE_URL.replace(/\/$/, "");
    const upstreamURL = `${originBase}${url.pathname}${url.search}`;
    const headers = new Headers(request.headers);

    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", "https");

    const upstreamRequest = new Request(upstreamURL, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    const upstreamResponse = await fetch(upstreamRequest, {
      cf: {
        cacheTtl: request.method === "GET" && url.pathname === "/healthz" ? 30 : undefined,
        cacheEverything: request.method === "GET" && url.pathname === "/healthz",
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    Object.entries(cors).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  },
};
