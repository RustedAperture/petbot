import { BiteUser, PetUser } from "../types/user.js";
import { RGBTuple } from "discord.js";

export function hexToRGBTuple(hex: string) {
  
  hex = hex.replace("#", "");

  
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [r, g, b] as RGBTuple;
}

export function randomImage(target: PetUser | BiteUser) {
  return target.images[Math.floor(Math.random() * target.images.length)];
}
