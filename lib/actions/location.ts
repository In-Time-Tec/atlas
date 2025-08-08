"use server";

export async function getUserLocation() {
  const { headers } = await import("next/headers");
  const { geolocation } = await import("@vercel/functions");
  try {
    const headersList = await headers();
    const request = { headers: headersList } as any;
    const locationData = geolocation(request);
    return {
      country: locationData.country || "",
      countryCode: locationData.country || "",
      city: locationData.city || "",
      region: locationData.region || "",
      isIndia: locationData.country === "IN",
      loading: false,
    } as const;
  } catch (error) {
    console.error("Failed to get location from Vercel:", error);
    return {
      country: "Unknown",
      countryCode: "",
      city: "",
      region: "",
      isIndia: false,
      loading: false,
    } as const;
  }
}


