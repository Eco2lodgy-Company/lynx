import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";
import { hash, compare } from "bcryptjs";

const router = Router();

// PUT /api/profile
router.put("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { avatar, currentPassword, newPassword } = req.body;

    // Update avatar
    if (avatar) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar },
      });
      return res.status(200).json({ success: true, message: "Avatar mis à jour" });
    }

    // Update password
    if (currentPassword && newPassword) {
      const userData = await prisma.user.findUnique({ where: { id: user.id } });
      if (!userData) return res.status(404).json({ error: "Utilisateur introuvable" });

      const isValid = await compare(currentPassword, userData.password);
      if (!isValid) return res.status(400).json({ error: "Mot de passe actuel incorrect" });

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" });
      }

      const hashedPassword = await hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      return res.status(200).json({ success: true, message: "Mot de passe mis à jour" });
    }

    return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
