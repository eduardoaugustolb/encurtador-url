export interface Link {
  id: string;
  slug: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
