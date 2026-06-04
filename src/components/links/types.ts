export interface Link {
  id: string;
  slug: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  showOnHome: boolean;
  icon: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
