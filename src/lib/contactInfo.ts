export const publicContactInfo = {
  company: "LOUREX",
  email: "lourrex@proton.me",
  phone: "00905392411642",
  phoneTel: "+905392411642",
  whatsappNumbers: {
    turkey: {
      number: "905392411642",
      display: "00905392411642",
    },
  },
  website: "www.lou-rex.com",
  websiteUrl: "https://www.lou-rex.com",
  social: {
    instagram: "https://www.instagram.com/lourex___/",
    tiktok: "https://www.tiktok.com/@lourex49",
  },
  location: {
    en: "Homs, Syria",
    ar: "حمص، سوريا",
  },
  commercialRegistration: {
    number: "62800",
    en: "Commercial Registration No. 62800",
    ar: "السجل التجاري رقم 62800",
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
