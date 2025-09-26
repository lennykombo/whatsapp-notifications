import fetch from "node-fetch";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 🔹 Build service account object from individual env vars
const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"), // 🔑 very important for multiline key
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
};

// ✅ Init Firebase Admin (only once per cold start)
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

export async function handler(event) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // 👈 use your frontend URL in production
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 🔹 Handle preflight OPTIONS request (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "Preflight OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: "Method Not Allowed",
    };
  }

  try {
    const { restaurantId, toNumber, message } = JSON.parse(event.body);

    console.log("Incoming Payload:", { restaurantId, toNumber, message });

    if (!restaurantId || !toNumber || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }

    // 🔑 Fetch restaurant credentials
    const doc = await db.collection("restaurants").doc(restaurantId).get();
    if (!doc.exists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Restaurant not found" }),
      };
    }

    const { phoneNumberId, whatsappToken, defaultNotifyNumber } = doc.data();
    console.log("Restaurant Credentials:", {
      phoneNumberId,
      whatsappTokenExists: !!whatsappToken,
      defaultNotifyNumber,
    });

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: defaultNotifyNumber || toNumber,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();
    console.log("WhatsApp API Response:", data);

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: corsHeaders,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
