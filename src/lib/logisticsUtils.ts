/**
 * Helper utility for calculating Volumetric capacity (CBM).
 * 
 * Takes an array of packing items with their dimensions in centimeters
 * and quantity, and returns the total CBM rounded to two decimal places.
 * 
 * Formula for CBM per item: (Length * Width * Height) / 1,000,000
 */
export interface PackingItem {
  length: number;
  width: number;
  height: number;
  quantity: number;
}

export const calculateTotalCBM = (items: PackingItem[]): number => {
  if (!items || items.length === 0) return 0;

  const total = items.reduce((sum, item) => {
    const itemCbm = (item.length * item.width * item.height) / 1000000;
    return sum + (itemCbm * item.quantity);
  }, 0);

  // Return perfectly rounded total CBM capacity (e.g. 14.50)
  return Math.round(total * 100) / 100;
};
