import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

// 🔹 Parse service account JSON from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// ✅ Init Firebase Admin only once
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

export async function handler(event) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.CLIENT_URL || "https://reserveme.ke",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 🔹 Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // 🔹 Allow only POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { restaurantId, toNumber, message } = JSON.parse(event.body);
    console.log("📥 Incoming Payload:", { restaurantId, toNumber, message });

    if (!restaurantId || !toNumber || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }

    // 🔑 Fetch restaurant from users collection
    const userDoc = await db.collection("users").doc(restaurantId).get();
    if (!userDoc.exists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Restaurant not found" }),
      };
    }

    const { phoneNumber } = userDoc.data();
    const notifyNumber = phoneNumber || toNumber;

    // 🔑 WhatsApp credentials from env
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !whatsappToken) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing WhatsApp credentials" }),
      };
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: notifyNumber,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json();
    console.log("✅ WhatsApp API Response:", data);

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: corsHeaders,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ Error sending WhatsApp:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
}







/*import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

// 🔹 Parse service account JSON from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// ✅ Init Firebase Admin only once
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db = getFirestore();

export async function handler(event) {
  const corsHeaders = {
   // "Access-Control-Allow-Origin": process.env.CLIENT_URL || "*", // 👈 set in Netlify env
    "Access-Control-Allow-Origin": "https://reserveme.ke", 
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 🔹 Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No Content
      headers: corsHeaders,
      body: "",
    };
  }

  // 🔹 Allow only POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { restaurantId, toNumber, message } = JSON.parse(event.body);

    console.log("📥 Incoming Payload:", { restaurantId, toNumber, message });

    if (!restaurantId || !toNumber || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }

    // 🔑 Fetch restaurant credentials from Firestore
  /*  const doc = await db.collection("restaurants").doc(restaurantId).get();

     if (!doc.exists) {
  // fallback to users collection
     doc = await db.collection("users").doc(restaurantId).get();
    }

    if (!doc.exists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Restaurant not found" }),
      };
    }*//*
   let doc = await db.collection("restaurants").doc(restaurantId).get();

if (!doc.exists) {
  doc = await db.collection("users").doc(restaurantId).get();
}

if (!doc.exists) {
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: "Restaurant not found" }),
  };
}


    const { phoneNumberId, whatsappToken, defaultNotifyNumber } = doc.data();
    console.log("📲 Restaurant Credentials:", {
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
    console.log("✅ WhatsApp API Response:", data);

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: corsHeaders,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("❌ Error sending WhatsApp:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
*/