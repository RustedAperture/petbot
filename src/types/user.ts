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

export interface ActionUser {
  id: number;
  user_id: string;
  location_id: string | null;
  action_type: string;
  has_performed: number;
  has_received: number;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}
