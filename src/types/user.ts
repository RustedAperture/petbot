export interface User {
  id: number;
  userId: string;
  guildId: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PetUser extends User {
  hasPet: number;
  hasBeenPet: number;
}

export interface BiteUser extends User {
  hasBitten: number;
  hasBeenBitten: number;
}

export interface ActionUser {
  id: number;
  userId: string;
  locationId: string | null;
  actionType: string;
  hasPerformed: number;
  hasReceived: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}
