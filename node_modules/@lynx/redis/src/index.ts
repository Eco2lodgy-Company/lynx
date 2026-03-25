import Redis from "ioredis";

// Configuration pour Upstash Redis (ou Redis local en dev)
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Instance Redis partagée
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => console.error("[Redis] Erreur de connexion:", err));
redis.on("connect", () => console.log("[Redis] Connecté"));

export default redis;
