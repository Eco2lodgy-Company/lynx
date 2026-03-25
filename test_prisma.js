const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.fieldVisit.count();
        console.log('FieldVisit count:', count);
    } catch (error) {
        console.error('Error accessing FieldVisit:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
