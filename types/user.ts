export interface User {
  id: number;
  user_id: string;
  guild_id: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PetUser extends User {
  has_pet: number;
  has_been_pet: number;
}

export interface BiteUser extends User {
  has_bitten: number;
  has_been_bitten: number;
}
