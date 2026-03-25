import { Router } from "express";
import prisma from "@lynx/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret";

// POST /api/auth/login
router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...safeUser } = user;
    return res.status(200).json({
      user: safeUser,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true }
    });
    
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const { password, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error("Auth me error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
