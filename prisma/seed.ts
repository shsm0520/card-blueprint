import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Check if cards already exist
  const existingCardsCount = await prisma.card.count();
  if (existingCardsCount > 0) {
    console.log(
      `✅ Database already seeded (${existingCardsCount} cards found). Skipping seed.`
    );
    return;
  }

  console.log("📝 No existing data found. Creating initial cards...");

  // === CHASE CARDS ===
  const chaseSapphirePreferred = await prisma.card.create({
    data: {
      slug: "chase-sapphire-preferred",
      name: "Chase Sapphire Preferred",
      issuer: "Chase",
      cardType: "personal",
      annualFee: 95,
      tags: JSON.stringify([
        "UR",
        "travel",
        "dining",
        "ur-transfer",
        "beginner-friendly",
      ]),
      isActive: true,
    },
  });

  const chaseSapphireReserve = await prisma.card.create({
    data: {
      slug: "chase-sapphire-reserve",
      name: "Chase Sapphire Reserve",
      issuer: "Chase",
      cardType: "personal",
      annualFee: 550,
      tags: JSON.stringify([
        "UR",
        "travel",
        "dining",
        "ur-transfer",
        "premium",
        "lounge-access",
      ]),
      isActive: true,
    },
  });

  const chaseFreedomUnlimited = await prisma.card.create({
    data: {
      slug: "chase-freedom-unlimited",
      name: "Chase Freedom Unlimited",
      issuer: "Chase",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify([
        "UR",
        "cashback",
        "no-annual-fee",
        "beginner-friendly",
      ]),
      isActive: true,
    },
  });

  const chaseFreedomFlex = await prisma.card.create({
    data: {
      slug: "chase-freedom-flex",
      name: "Chase Freedom Flex",
      issuer: "Chase",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify([
        "UR",
        "cashback",
        "no-annual-fee",
        "rotating-categories",
      ]),
      isActive: true,
    },
  });

  const chaseInkBusinessPreferred = await prisma.card.create({
    data: {
      slug: "chase-ink-business-preferred",
      name: "Chase Ink Business Preferred",
      issuer: "Chase",
      cardType: "business",
      annualFee: 95,
      tags: JSON.stringify(["UR", "business", "ur-transfer", "travel"]),
      isActive: true,
    },
  });

  // === AMEX CARDS ===
  const amexPlatinum = await prisma.card.create({
    data: {
      slug: "amex-platinum",
      name: "American Express Platinum",
      issuer: "Amex",
      cardType: "personal",
      annualFee: 695,
      tags: JSON.stringify([
        "MR",
        "travel",
        "mr-transfer",
        "premium",
        "lounge-access",
      ]),
      isActive: true,
    },
  });

  const amexGold = await prisma.card.create({
    data: {
      slug: "amex-gold",
      name: "American Express Gold",
      issuer: "Amex",
      cardType: "personal",
      annualFee: 325,
      tags: JSON.stringify(["MR", "dining", "groceries", "mr-transfer"]),
      isActive: true,
    },
  });

  const amexBlueCashPreferred = await prisma.card.create({
    data: {
      slug: "amex-blue-cash-preferred",
      name: "American Express Blue Cash Preferred",
      issuer: "Amex",
      cardType: "personal",
      annualFee: 95,
      tags: JSON.stringify(["cashback", "groceries", "gas"]),
      isActive: true,
    },
  });

  const amexBlueCashEveryday = await prisma.card.create({
    data: {
      slug: "amex-blue-cash-everyday",
      name: "American Express Blue Cash Everyday",
      issuer: "Amex",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify(["cashback", "no-annual-fee", "groceries"]),
      isActive: true,
    },
  });

  // === CITI CARDS ===
  const citiDoubleCash = await prisma.card.create({
    data: {
      slug: "citi-double-cash",
      name: "Citi Double Cash",
      issuer: "Citi",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify(["cashback", "no-annual-fee", "simple"]),
      isActive: true,
    },
  });

  const citiCustomCash = await prisma.card.create({
    data: {
      slug: "citi-custom-cash",
      name: "Citi Custom Cash",
      issuer: "Citi",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify([
        "cashback",
        "no-annual-fee",
        "automatic-categories",
      ]),
      isActive: true,
    },
  });

  // === CAPITAL ONE CARDS ===
  const capitalOneVenture = await prisma.card.create({
    data: {
      slug: "capital-one-venture",
      name: "Capital One Venture",
      issuer: "Capital One",
      cardType: "personal",
      annualFee: 95,
      tags: JSON.stringify(["miles", "travel", "simple-redemption"]),
      isActive: true,
    },
  });

  const capitalOneVentureX = await prisma.card.create({
    data: {
      slug: "capital-one-venture-x",
      name: "Capital One Venture X",
      issuer: "Capital One",
      cardType: "personal",
      annualFee: 395,
      tags: JSON.stringify(["miles", "travel", "premium", "lounge-access"]),
      isActive: true,
    },
  });

  const capitalOneSavorOne = await prisma.card.create({
    data: {
      slug: "capital-one-savor-one",
      name: "Capital One SavorOne",
      issuer: "Capital One",
      cardType: "personal",
      annualFee: 0,
      tags: JSON.stringify([
        "cashback",
        "dining",
        "entertainment",
        "no-annual-fee",
      ]),
      isActive: true,
    },
  });

  console.log(`✅ Created ${await prisma.card.count()} cards`);

  // === ADMIN REFERRALS (examples) ===
  await prisma.adminReferral.create({
    data: {
      cardId: chaseSapphirePreferred.id,
      url: "https://example.com/chase-sapphire-preferred-referral",
      label: "Apply Now - 60k UR Bonus",
      isActive: true,
    },
  });

  await prisma.adminReferral.create({
    data: {
      cardId: amexPlatinum.id,
      url: "https://example.com/amex-platinum-referral",
      label: "Apply Now - 125k MR Bonus",
      isActive: true,
    },
  });

  await prisma.adminReferral.create({
    data: {
      cardId: chaseFreedomUnlimited.id,
      url: "https://example.com/chase-freedom-unlimited-referral",
      label: "Apply Now",
      isActive: true,
    },
  });

  console.log(
    `✅ Created ${await prisma.adminReferral.count()} admin referrals`
  );

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
