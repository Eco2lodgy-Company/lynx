import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "@lynx/prisma";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.AUTH_SECRET || "fallback_development_secret_only";

// POST /api/mobile/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Veuillez fournir un email et un mot de passe." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Identifiants invalides ou compte inactif." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Identifiants invalides ou compte inactif." });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        image: user.avatar,
      }
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

export default router;
