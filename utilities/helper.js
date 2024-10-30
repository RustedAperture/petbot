exports.getPetSlot = (slot) => {
	const petSlots = {
		1: "pet_img",
		2: "pet_img_two",
		3: "pet_img_three",
		4: "pet_img_four",
	};

	return petSlots[slot] || null;
};

exports.countPetImages = (petTarget) => {
	let numPetImages = 0;

	if (petTarget.pet_img) {
		numPetImages++;
	}
	if (petTarget.pet_img_two) {
		numPetImages++;
	}
	if (petTarget.pet_img_three) {
		numPetImages++;
	}
	if (petTarget.pet_img_four) {
		numPetImages++;
	}

	return numPetImages;
};
