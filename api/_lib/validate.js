const { z } = require("zod");

// Chaînes "sûres": longueur bornée, pas de balises HTML brutes.
const safeText = (max) =>
  z.string().trim().min(1).max(max).transform((v) => v.replace(/<[^>]*>/g, ""));

const optionalSafeText = (max) =>
  z.string().trim().max(max).transform((v) => v.replace(/<[^>]*>/g, "")).optional().or(z.literal(""));

const email = z.string().trim().email().max(180);
const phone = z.string().trim().min(6).max(30).regex(/^[0-9+\-()\s]+$/, "Nimewo telefòn envalid");

const contactSchema = z.object({
  name: safeText(120),
  phone,
  whatsapp: optionalSafeText(30),
  email,
  city: optionalSafeText(80),
  department: optionalSafeText(80),
  message: safeText(4000),
  // Honeypot: champ invisible pour les humains, rempli seulement par les bots.
  // On accepte n'importe quelle valeur ici (pas de rejet de validation) —
  // c'est le handler qui décide silencieusement de ne rien enregistrer.
  company: z.string().max(500).optional().or(z.literal("")),
});

const bookingSchema = z.object({
  service: safeText(120),
  consult_type: z.enum(["online", "person"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dat envalid"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Lè envalid"),
  name: safeText(120),
  phone,
  whatsapp: optionalSafeText(30),
  email,
  city: optionalSafeText(80),
  department: optionalSafeText(80),
  message: optionalSafeText(4000),
  company: z.string().max(500).optional().or(z.literal("")),
});

const startBusinessSchema = z.object({
  name: safeText(120),
  phone,
  whatsapp: optionalSafeText(30),
  email,
  city: optionalSafeText(80),
  department: optionalSafeText(80),
  business_name: optionalSafeText(150),
  industry: optionalSafeText(150),
  description: safeText(4000),
  budget: optionalSafeText(80),
  needs: optionalSafeText(300),
  website_yn: z.boolean().optional().default(false),
  shop_yn: z.boolean().optional().default(false),
  facebook_yn: z.boolean().optional().default(false),
  instagram_yn: z.boolean().optional().default(false),
  seo_yn: z.boolean().optional().default(false),
  extra: optionalSafeText(4000),
  company: z.string().max(500).optional().or(z.literal("")),
});

const loginSchema = z.object({
  email,
  password: z.string().min(8).max(200),
});

module.exports = { contactSchema, bookingSchema, startBusinessSchema, loginSchema };
