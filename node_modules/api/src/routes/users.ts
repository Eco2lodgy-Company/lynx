import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import bcrypt from "bcryptjs";

const router = Router();

// GET /api/users — Liste des utilisateurs
router.get("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const users = await prisma.user.findMany({
      include: { department: true },
      orderBy: { createdAt: "desc" },
    });

    // Remove passwords from response
    const safeUsers = users.map((u: any) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    return res.status(200).json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/users — Créer un utilisateur
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { email, password: rawPassword, firstName, lastName, phone, role, departmentId } = req.body;

    if (!email || !rawPassword || !firstName || !lastName || !role) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Cet email existe déjà" });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role,
        departmentId: departmentId || null,
      },
      include: { department: true },
    });

    const { password, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
  }
});

export default router;
