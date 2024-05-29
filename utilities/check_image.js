exports.checkImage = async (url) => {
	try {
		const response = await fetch(url);
		const content = await response.blob();
		return content.type.startsWith("image/");
	} catch (error) {
		console.error("Error fetching URL:", error);
		return false; // Handle potential errors
	}
};
