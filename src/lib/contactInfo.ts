export const publicContactInfo = {
  company: "LOUREX",
  email: "alidamish@lou-rex.com",
  phone: "00905392411642",
  phoneTel: "+905392411642",
  whatsappNumber: "905392411642",
  website: "www.lou-rex.com",
  websiteUrl: "https://www.lou-rex.com",
  location: {
    en: "Istanbul, Turkey",
    ar: "إسطنبول، تركيا",
  },
  operationsDesk: {
    en: "Operations Desk",
    ar: "مكتب العمليات",
  },
  businessHours: {
    en: "Sunday to Thursday, 09:00 - 18:00 (GMT+3)",
    ar: "الأحد إلى الخميس، 09:00 - 18:00 (GMT+3)",
  },
} as const;

export const getWhatsAppUrl = (message: string) =>
  `https://wa.me/${publicContactInfo.whatsappNumber}?text=${encodeURIComponent(message)}`;
