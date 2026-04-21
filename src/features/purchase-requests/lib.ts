export interface ParsedPurchaseRequestPayload {
  productName?: string;
  productDescription?: string;
  quantity?: string;
  sizeDimensions?: string;
  color?: string;
  material?: string;
  technicalSpecs?: string;
  referenceLink?: string;
  preferredShippingMethod?: string;
  deliveryNotes?: string;
  imageUrls?: string[];
}

const fieldMap: Record<string, keyof ParsedPurchaseRequestPayload> = {
  Product: "productName",
  Description: "productDescription",
  Quantity: "quantity",
  "Size/Dimensions": "sizeDimensions",
  Color: "color",
  Material: "material",
  "Technical Specs": "technicalSpecs",
  "Reference Link": "referenceLink",
  "Preferred Shipping Method": "preferredShippingMethod",
  "Delivery Notes": "deliveryNotes",
  "Request Images": "imageUrls",
};

export const parsePurchaseRequestMessage = (message?: string | null): ParsedPurchaseRequestPayload => {
  if (!message) return {};

  const parsed: ParsedPurchaseRequestPayload = {};
  const lines = message.split("\n").map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const rawKey = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const mappedKey = fieldMap[rawKey];

    if (!mappedKey) continue;

    if (mappedKey === "imageUrls") {
      parsed.imageUrls = value === "N/A" ? [] : value.split(",").map((item) => item.trim()).filter(Boolean);
      continue;
    }

    parsed[mappedKey] = value === "N/A" ? "" : value;
  }

  return parsed;
};
