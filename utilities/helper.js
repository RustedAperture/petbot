exports.getPetSlot = (slot) => {
  const petSlots = {
    1: "pet_img",
    2: "pet_img_two",
    3: "pet_img_three",
    4: "pet_img_four",
  };

  return petSlots[slot] || null;
};

exports.hexToRGBTuple = (hex) => {
  // Remove the '#' character if present
  hex = hex.replace("#", "");

  // Parse the hex string into RGB values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return [r, g, b];
};

exports.countImages = (target) => {
  return target.images.length;
};

exports.randomImage = (target) => {
  return target.images[Math.floor(Math.random() * target.images.length)];
};
