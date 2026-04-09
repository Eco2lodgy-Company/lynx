import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding LYNX database...\n");

    // ==========================================
    // DEPARTMENTS
    // ==========================================
    const depConstruction = await prisma.department.create({
        data: { name: "Construction", description: "Département principal de construction" },
    });
    const depElectricite = await prisma.department.create({
        data: { name: "Électricité", description: "Installations électriques" },
    });
    const depPlomberie = await prisma.department.create({
        data: { name: "Plomberie", description: "Plomberie et réseaux hydrauliques" },
    });
    console.log("✅ Départements créés");

    // ==========================================
    // USERS (all passwords: "password123")
    // ==========================================
    const hashedPassword = await bcrypt.hash("password123", 12);

    const admin = await prisma.user.create({
        data: {
            email: "admin@lynx.ngs",
            password: hashedPassword,
            firstName: "Ahmed",
            lastName: "Benali",
            phone: "+213 555 100 100",
            role: "ADMIN",
            departmentId: depConstruction.id,
        },
    });

    const conducteur = await prisma.user.create({
        data: {
            email: "conducteur@lynx.ngs",
            password: hashedPassword,
            firstName: "Karim",
            lastName: "Messaoudi",
            phone: "+213 555 200 200",
            role: "CONDUCTEUR",
            departmentId: depConstruction.id,
        },
    });

    const chefEquipe = await prisma.user.create({
        data: {
            email: "chef@lynx.ngs",
            password: hashedPassword,
            firstName: "Yacine",
            lastName: "Boudjemaa",
            phone: "+213 555 300 300",
            role: "CHEF_EQUIPE",
            departmentId: depConstruction.id,
        },
    });

    const client = await prisma.user.create({
        data: {
            email: "client@lynx.ngs",
            password: hashedPassword,
            firstName: "Sofiane",
            lastName: "Hamdi",
            phone: "+213 555 400 400",
            role: "CLIENT",
        },
    });

    const ouvrier1 = await prisma.user.create({
        data: {
            email: "ouvrier1@lynx.ngs",
            password: hashedPassword,
            firstName: "Mohamed",
            lastName: "Ait Ahmed",
            phone: "+213 555 500 500",
            role: "OUVRIER",
            departmentId: depConstruction.id,
        },
    });

    const ouvrier2 = await prisma.user.create({
        data: {
            email: "ouvrier2@lynx.ngs",
            password: hashedPassword,
            firstName: "Rachid",
            lastName: "Kaci",
            phone: "+213 555 600 600",
            role: "OUVRIER",
            departmentId: depElectricite.id,
        },
    });

    const ouvrier3 = await prisma.user.create({
        data: {
            email: "ouvrier3@lynx.ngs",
            password: hashedPassword,
            firstName: "Omar",
            lastName: "Bouzid",
            phone: "+213 555 700 700",
            role: "OUVRIER",
            departmentId: depPlomberie.id,
        },
    });

    console.log("✅ Utilisateurs créés");

    // ==========================================
    // TEAMS
    // ==========================================
    const team1 = await prisma.team.create({
        data: {
            name: "Équipe Gros Œuvre",
            description: "Travaux de structure et fondation",
            leaderId: chefEquipe.id,
            departmentId: depConstruction.id,
        },
    });

    await prisma.teamMember.createMany({
        data: [
            { teamId: team1.id, userId: ouvrier1.id },
            { teamId: team1.id, userId: ouvrier2.id },
            { teamId: team1.id, userId: ouvrier3.id },
        ],
    });
    console.log("✅ Équipes créées");

    // ==========================================
    // PROJECTS
    // ==========================================
    const project1 = await prisma.project.create({
        data: {
            name: "Villa Moderne Hydra",
            description: "Construction d'une villa contemporaine de 350m² avec piscine et jardin paysager.",
            address: "Lot 42, Cité Hydra, Alger",
            latitude: 36.74,
            longitude: 3.04,
            status: "EN_COURS",
            priority: "HAUTE",
            startDate: new Date("2024-03-01"),
            estimatedEndDate: new Date("2024-12-15"),
            budget: 45000000,
            progress: 64,
            supervisorId: conducteur.id,
            clientId: client.id,
            departmentId: depConstruction.id,
        },
    });

    const project2 = await prisma.project.create({
        data: {
            name: "Résidence Les Oliviers",
            description: "Immeuble résidentiel R+5 avec 20 appartements, parking souterrain et espaces verts.",
            address: "Boulevard des Martyrs, Bab Ezzouar",
            status: "EN_COURS",
            priority: "HAUTE",
            startDate: new Date("2024-01-15"),
            estimatedEndDate: new Date("2025-06-30"),
            budget: 180000000,
            progress: 35,
            supervisorId: conducteur.id,
            departmentId: depConstruction.id,
        },
    });

    const project3 = await prisma.project.create({
        data: {
            name: "Centre Commercial Bab Ezzouar",
            description: "Centre commercial de 5000m² sur 3 niveaux avec food court.",
            address: "Zone commerciale, Bab Ezzouar, Alger",
            status: "PLANIFIE",
            priority: "NORMALE",
            startDate: new Date("2025-02-01"),
            estimatedEndDate: new Date("2026-08-30"),
            budget: 500000000,
            progress: 0,
            supervisorId: conducteur.id,
            departmentId: depConstruction.id,
        },
    });

    // Link team to projects
    await prisma.projectTeam.createMany({
        data: [
            { projectId: project1.id, teamId: team1.id },
            { projectId: project2.id, teamId: team1.id },
        ],
    });
    console.log("✅ Projets créés");

    // ==========================================
    // PHASES
    // ==========================================
    const phase1 = await prisma.phase.create({
        data: {
            name: "Fondation",
            description: "Terrassement, fouilles et coulage des fondations",
            order: 1,
            status: "TERMINE",
            startDate: new Date("2024-03-01"),
            endDate: new Date("2024-05-15"),
            progress: 100,
            projectId: project1.id,
        },
    });

    const phase2 = await prisma.phase.create({
        data: {
            name: "Structure & Gros Œuvre",
            description: "Élévation des murs, charpente et toiture",
            order: 2,
            status: "EN_COURS",
            startDate: new Date("2024-05-16"),
            progress: 75,
            projectId: project1.id,
        },
    });

    const phase3 = await prisma.phase.create({
        data: {
            name: "Second Œuvre",
            description: "Électricité, plomberie, revêtements",
            order: 3,
            status: "A_FAIRE",
            projectId: project1.id,
        },
    });

    const phase4 = await prisma.phase.create({
        data: {
            name: "Finitions",
            description: "Peinture, menuiserie, aménagement extérieur",
            order: 4,
            status: "A_FAIRE",
            projectId: project1.id,
        },
    });
    console.log("✅ Phases créées");

    // ==========================================
    // TASKS
    // ==========================================
    const task1 = await prisma.task.create({
        data: {
            title: "Coulage dalle RDC",
            description: "Couler la dalle du rez-de-chaussée avec béton B30",
            status: "TERMINE",
            priority: "HAUTE",
            startDate: new Date("2024-03-15"),
            dueDate: new Date("2024-04-01"),
            completedAt: new Date("2024-03-30"),
            progress: 100,
            projectId: project1.id,
            phaseId: phase1.id,
        },
    });

    const task2 = await prisma.task.create({
        data: {
            title: "Élévation murs 1er étage",
            description: "Montage des murs porteurs et cloisons du 1er étage",
            status: "EN_COURS",
            priority: "HAUTE",
            startDate: new Date("2024-07-01"),
            dueDate: new Date("2024-08-15"),
            progress: 60,
            projectId: project1.id,
            phaseId: phase2.id,
        },
    });

    const task3 = await prisma.task.create({
        data: {
            title: "Installation charpente toiture",
            description: "Pose de la charpente métallique et couverture",
            status: "A_FAIRE",
            priority: "NORMALE",
            dueDate: new Date("2024-09-30"),
            progress: 0,
            projectId: project1.id,
            phaseId: phase2.id,
        },
    });

    const task4 = await prisma.task.create({
        data: {
            title: "Câblage électrique RDC",
            description: "Installation du réseau électrique du rez-de-chaussée",
            status: "A_FAIRE",
            priority: "NORMALE",
            projectId: project1.id,
            phaseId: phase3.id,
        },
    });

    // Task assignments
    await prisma.taskAssignment.createMany({
        data: [
            { taskId: task1.id, userId: ouvrier1.id },
            { taskId: task2.id, userId: ouvrier1.id },
            { taskId: task2.id, userId: ouvrier2.id },
            { taskId: task3.id, userId: ouvrier1.id },
            { taskId: task4.id, userId: ouvrier2.id },
        ],
    });
    console.log("✅ Tâches créées");

    // ==========================================
    // DAILY LOGS
    // ==========================================
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await prisma.dailyLog.createMany({
        data: [
            {
                date: twoDaysAgo,
                weather: "ENSOLEILLE",
                temperature: 32,
                summary: "Bonne progression sur le chantier. Coulage du 2ème étage terminé.",
                workCompleted: "Coffrage et coulage terminés. Décoffrage prévu demain.",
                issues: "RAS",
                status: "VALIDE",
                authorId: chefEquipe.id,
                projectId: project1.id,
            },
            {
                date: yesterday,
                weather: "NUAGEUX",
                temperature: 28,
                summary: "Avancement normal malgré le temps couvert.",
                workCompleted: "Décoffrage 2ème étage. Début montage murs.",
                issues: "Retard livraison acier — impact estimé 2 jours.",
                status: "SOUMIS",
                authorId: chefEquipe.id,
                projectId: project1.id,
            },
            {
                date: today,
                weather: "ENSOLEILLE",
                temperature: 30,
                summary: "Journée productive. Bonne coordination des équipes.",
                workCompleted: "Montage murs 1er étage avancé à 60%.",
                status: "BROUILLON",
                authorId: chefEquipe.id,
                projectId: project1.id,
            },
        ],
    });
    console.log("✅ Journaux de chantier créés");

    // ==========================================
    // ATTENDANCE
    // ==========================================
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    await prisma.attendance.createMany({
        data: [
            {
                date: todayDate,
                checkIn: new Date(todayDate.getTime() + 7 * 60 * 60 * 1000), // 07:00
                status: "PRESENT",
                userId: ouvrier1.id,
            },
            {
                date: todayDate,
                checkIn: new Date(todayDate.getTime() + 7.5 * 60 * 60 * 1000), // 07:30
                status: "RETARD",
                notes: "Retard de 30 min — problème de transport",
                userId: ouvrier2.id,
            },
            {
                date: todayDate,
                status: "ABSENT",
                notes: "Maladie — certificat médical fourni",
                userId: ouvrier3.id,
            },
        ],
    });
    console.log("✅ Pointages créés");

    // ==========================================
    // INCIDENTS
    // ==========================================
    await prisma.incident.create({
        data: {
            title: "Fissure mur porteur RDC",
            description: "Fissure horizontale détectée sur le mur porteur nord du RDC, longueur ~1.5m. Nécessite expertise structurelle.",
            severity: "HAUTE",
            status: "EN_COURS",
            location: "Mur nord RDC, Section B2",
            date: yesterday,
            reporterId: chefEquipe.id,
            projectId: project1.id,
        },
    });

    await prisma.incident.create({
        data: {
            title: "Livraison acier en retard",
            description: "Le fournisseur SARL ElHadid signale un retard de livraison de 3-5 jours pour les barres HA16.",
            severity: "MOYENNE",
            status: "OUVERT",
            date: today,
            reporterId: chefEquipe.id,
            projectId: project1.id,
        },
    });
    console.log("✅ Incidents créés");

    // ==========================================
    // REPORTS
    // ==========================================
    await prisma.report.createMany({
        data: [
            {
                title: "Rapport Hebdomadaire — Semaine 24",
                type: "HEBDOMADAIRE",
                content: "Progression conforme au planning. Pas de blocage majeur.",
                status: "PUBLIE",
                periodStart: new Date("2024-08-14"),
                periodEnd: new Date("2024-08-21"),
                projectId: project1.id,
            },
            {
                title: "Rapport Hebdomadaire — Semaine 23",
                type: "HEBDOMADAIRE",
                content: "Bon avancement sur la structure. Budget sous contrôle.",
                status: "PUBLIE",
                periodStart: new Date("2024-08-07"),
                periodEnd: new Date("2024-08-14"),
                projectId: project1.id,
            },
        ],
    });
    console.log("✅ Rapports créés");

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    await prisma.notification.createMany({
        data: [
            {
                title: "Journal soumis",
                message: "Yacine Boudjemaa a soumis le journal du chantier Villa Moderne Hydra.",
                type: "VALIDATION",
                userId: conducteur.id,
                link: "/conducteur/validations",
            },
            {
                title: "Nouvel incident",
                message: "Un incident de sévérité HAUTE a été signalé sur Villa Moderne Hydra.",
                type: "INCIDENT",
                userId: admin.id,
                link: "/admin/projects",
            },
            {
                title: "Tâche assignée",
                message: "Vous avez été assigné à la tâche : Élévation murs 1er étage.",
                type: "TACHE",
                userId: ouvrier1.id,
                link: "/ouvrier/tasks",
            },
        ],
    });
    console.log("✅ Notifications créées");

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log("\n========================================");
    console.log("🎉 Base de données LYNX initialisée !");
    console.log("========================================");
    console.log("\n📋 Comptes de test (mot de passe: password123):");
    console.log("  ├── Admin:       admin@lynx.ngs");
    console.log("  ├── Conducteur:  conducteur@lynx.ngs");
    console.log("  ├── Chef équipe: chef@lynx.ngs");
    console.log("  ├── Client:      client@lynx.ngs");
    console.log("  ├── Ouvrier 1:   ouvrier1@lynx.ngs");
    console.log("  ├── Ouvrier 2:   ouvrier2@lynx.ngs");
    console.log("  └── Ouvrier 3:   ouvrier3@lynx.ngs");
    console.log("\n📊 Données créées:");
    console.log("  ├── 3 Départements");
    console.log("  ├── 7 Utilisateurs");
    console.log("  ├── 1 Équipe (3 membres)");
    console.log("  ├── 3 Projets");
    console.log("  ├── 4 Phases");
    console.log("  ├── 4 Tâches");
    console.log("  ├── 3 Journaux de chantier");
    console.log("  ├── 3 Pointages");
    console.log("  ├── 2 Incidents");
    console.log("  ├── 2 Rapports");
    console.log("  └── 3 Notifications");
    console.log("");
}

main()
    .catch((e) => {
        console.error("❌ Erreur lors du seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
