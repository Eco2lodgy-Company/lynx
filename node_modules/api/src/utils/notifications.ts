import prisma from "@lynx/prisma";

/**
 * Create a notification for a specific user.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "ALERTE" | "VALIDATION" | "TACHE" | "INCIDENT";
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: link || null,
    },
  });
}

/**
 * Create notifications for ALL admins + the project supervisor.
 */
export async function notifyAdminsAndSupervisor({
  projectId,
  title,
  message,
  type = "ALERTE",
  link,
  excludeUserId,
}: {
  projectId: string;
  title: string;
  message: string;
  type?: "INFO" | "ALERTE" | "VALIDATION" | "TACHE" | "INCIDENT";
  link?: string;
  excludeUserId?: string;
}) {
  // Get all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  // Get project supervisor
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { supervisorId: true },
  });

  const targetIds = new Set(admins.map((a: any) => a.id));
  if (project?.supervisorId) targetIds.add(project.supervisorId);
  if (excludeUserId) targetIds.delete(excludeUserId);

  const notifications = Array.from(targetIds).map((userId) => ({
    userId: userId as string,
    title,
    message,
    type,
    link: link || null,
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}
