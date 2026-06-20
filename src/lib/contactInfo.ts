export const publicContactInfo = {
  company: "LOUREX",
  email: "alidamish@lou-rex.com",
  phone: "00905392411642",
  phoneTel: "+905392411642",
  whatsappNumbers: {
    turkey: {
      number: "905392411642",
      display: "+90 539 241 1642",
    },
    saudi: {
      number: "966571660357",
      display: "+966 57 166 0357",
    },
  },
  website: "www.lou-rex.com",
  websiteUrl: "https://www.lou-rex.com",
  social: {
    instagram: "https://www.instagram.com/lourex___/",
    tiktok: "https://www.tiktok.com/@lourex49",
  },
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

export const getWhatsAppUrl = (message: string, number = publicContactInfo.whatsappNumbers.turkey.number) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
