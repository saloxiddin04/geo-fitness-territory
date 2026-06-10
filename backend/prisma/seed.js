/**
 * Database Seed
 * Boshlang'ich ma'lumotlarni yuklash
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed ma\'lumotlari yuklanmoqda...');

  // Super Admin yaratish
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@geofitness.uz' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'admin@geofitness.uz',
      passwordHash,
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Admin yaratildi: ${admin.email}`);

  // Tizim sozlamalari
  const settings = [
    { key: 'h3_resolution', value: '9', description: 'H3 grid resolution (7-12)', valueType: 'number' },
    { key: 'capture_threshold', value: '100', description: 'Hudud egallash uchun control points', valueType: 'number' },
    { key: 'control_points_per_100m', value: '10', description: 'Har 100m yugurish uchun control points', valueType: 'number' },
    { key: 'xp_per_new_cell', value: '5', description: 'Yangi cell kashf qilish uchun XP', valueType: 'number' },
    { key: 'xp_per_100m', value: '2', description: 'Har 100m yugurish uchun XP', valueType: 'number' },
    { key: 'xp_per_territory_capture', value: '50', description: 'Hudud egallash uchun XP', valueType: 'number' },
    { key: 'night_event_start', value: '20', description: 'Night event boshlanish soati', valueType: 'number' },
    { key: 'night_event_end', value: '23', description: 'Night event tugash soati', valueType: 'number' },
    { key: 'night_event_multiplier', value: '1.5', description: 'Night event multiplieri', valueType: 'number' },
    { key: 'max_speed_kmh', value: '50', description: 'Maksimal ruxsat etilgan tezlik (km/h)', valueType: 'number' },
    { key: 'max_gps_jump_meters', value: '500', description: 'GPS jump maksimal masofasi (m)', valueType: 'number' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: { ...setting, updatedBy: 'seed' },
    });
  }
  console.log(`✅ ${settings.length} ta sozlama yaratildi`);

  // Test foydalanuvchi (development uchun)
  if (process.env.NODE_ENV === 'development') {
    const userPassword = await bcrypt.hash('Test@123456', 12);
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@geofitness.uz' },
      update: {},
      create: {
        username: 'testuser',
        email: 'test@geofitness.uz',
        passwordHash: userPassword,
        displayName: 'Test Foydalanuvchi',
        region: 'toshkent_shahar',
      },
    });

    await prisma.userStatistics.upsert({
      where: { userId: testUser.id },
      update: {},
      create: { userId: testUser.id },
    });

    console.log(`✅ Test foydalanuvchi: ${testUser.email} | Parol: Test@123456`);
  }

  console.log('\n🎉 Seed muvaffaqiyatli yakunlandi!');
  console.log('\n📝 Admin ma\'lumotlari:');
  console.log('   Email: admin@geofitness.uz');
  console.log('   Parol: Admin@123456');
  console.log('\n⚠️  Ishlab chiqarishda parolni albatta o\'zgartiring!');
}

main()
  .catch((e) => {
    console.error('❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
