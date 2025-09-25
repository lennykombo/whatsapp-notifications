import fetch from "node-fetch";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ✅ Init Firebase Admin (only once per cold start)
const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
});
const db = getFirestore();

export async function handler(event) {
  // 🔹 Handle preflight OPTIONS request (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // 👈 change to frontend domain in prod
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "Preflight OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Method Not Allowed",
    };
  }

  try {
    const { restaurantId, toNumber, message } = JSON.parse(event.body);

    console.log("Incoming Payload:", { restaurantId, toNumber, message });

    if (!restaurantId || !toNumber || !message) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }

    // 🔑 Fetch restaurant credentials
    const doc = await db.collection("restaurants").doc(restaurantId).get();
    if (!doc.exists) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
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
        to: defaultNotifyNumber,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();
    console.log("WhatsApp API Response:", data);

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message }),
    };
  }
}
