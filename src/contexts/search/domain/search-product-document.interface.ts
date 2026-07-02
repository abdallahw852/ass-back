export interface SearchProductDocument {
  id: string;
  nameEn: string;
  nameAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  costPrice: number;
  discountedPrice: number | null;
  moq: number;
  viewCount: number;
  supplierId: number;
  supplierCountry: string;
  supplierType: string | null;
  supplierIsVerified: boolean;
  categoryId: string | null;
  categoryPath: string[];
  currency: string;
  condition: string;
  status: string;
  createdAt: Date | string;
}
