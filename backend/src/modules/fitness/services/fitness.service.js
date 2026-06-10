/**
 * Fitness Service - Foydalanuvchi statistikasi
 */

const { prisma } = require('../../../shared/config/database.config');

async function getUserStatistics(userId) {
  const stats = await prisma.userStatistics.findUnique({
    where: { userId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalXp: true, level: true, region: true },
  });

  return { ...stats, totalXp: user?.totalXp, level: user?.level, region: user?.region };
}

module.exports = { getUserStatistics };
