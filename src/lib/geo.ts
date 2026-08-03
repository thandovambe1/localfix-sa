export type SaCity = { city: string; province: string; lat: number; lng: number };

export const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
];

export const SA_CITIES: SaCity[] = [
  { city: "Johannesburg", province: "Gauteng", lat: -26.2041, lng: 28.0473 },
  { city: "Sandton", province: "Gauteng", lat: -26.1076, lng: 28.0567 },
  { city: "Randburg", province: "Gauteng", lat: -26.0936, lng: 27.9723 },
  { city: "Roodepoort", province: "Gauteng", lat: -26.1625, lng: 27.8725 },
  { city: "Midrand", province: "Gauteng", lat: -25.9992, lng: 28.1263 },
  { city: "Centurion", province: "Gauteng", lat: -25.8603, lng: 28.1894 },
  { city: "Pretoria", province: "Gauteng", lat: -25.7479, lng: 28.2293 },
  { city: "Benoni", province: "Gauteng", lat: -26.1885, lng: 28.3208 },
  { city: "Kempton Park", province: "Gauteng", lat: -26.1, lng: 28.2294 },
  { city: "Soweto", province: "Gauteng", lat: -26.2678, lng: 27.8585 },
  { city: "Vanderbijlpark", province: "Gauteng", lat: -26.7, lng: 27.8333 },
  { city: "Cape Town", province: "Western Cape", lat: -33.9249, lng: 18.4241 },
  { city: "Bellville", province: "Western Cape", lat: -33.9022, lng: 18.6292 },
  { city: "Somerset West", province: "Western Cape", lat: -34.0783, lng: 18.8506 },
  { city: "Stellenbosch", province: "Western Cape", lat: -33.9321, lng: 18.8602 },
  { city: "Paarl", province: "Western Cape", lat: -33.7342, lng: 18.9621 },
  { city: "George", province: "Western Cape", lat: -33.963, lng: 22.4617 },
  { city: "Durban", province: "KwaZulu-Natal", lat: -29.8587, lng: 31.0218 },
  { city: "Umhlanga", province: "KwaZulu-Natal", lat: -29.7266, lng: 31.0839 },
  { city: "Pietermaritzburg", province: "KwaZulu-Natal", lat: -29.6006, lng: 30.3794 },
  { city: "Ballito", province: "KwaZulu-Natal", lat: -29.5389, lng: 31.2144 },
  { city: "Richards Bay", province: "KwaZulu-Natal", lat: -28.7807, lng: 32.0383 },
  { city: "Gqeberha", province: "Eastern Cape", lat: -33.9608, lng: 25.6022 },
  { city: "East London", province: "Eastern Cape", lat: -33.0292, lng: 27.8546 },
  { city: "Mthatha", province: "Eastern Cape", lat: -31.5889, lng: 28.7844 },
  { city: "Bloemfontein", province: "Free State", lat: -29.0852, lng: 26.1596 },
  { city: "Welkom", province: "Free State", lat: -27.9852, lng: 26.7355 },
  { city: "Polokwane", province: "Limpopo", lat: -23.9045, lng: 29.4689 },
  { city: "Tzaneen", province: "Limpopo", lat: -23.833, lng: 30.1633 },
  { city: "Nelspruit", province: "Mpumalanga", lat: -25.4753, lng: 30.9694 },
  { city: "Witbank", province: "Mpumalanga", lat: -25.8776, lng: 29.1998 },
  { city: "Rustenburg", province: "North West", lat: -25.6672, lng: 27.2424 },
  { city: "Potchefstroom", province: "North West", lat: -26.7145, lng: 27.0975 },
  { city: "Kimberley", province: "Northern Cape", lat: -28.7282, lng: 24.7499 },
  { city: "Upington", province: "Northern Cape", lat: -28.4478, lng: 21.2561 },
];

export function findCity(name: string): SaCity | undefined {
  const n = name.trim().toLowerCase();
  return (
    SA_CITIES.find((c) => c.city.toLowerCase() === n) ??
    SA_CITIES.find((c) => c.city.toLowerCase().includes(n) && n.length > 2)
  );
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}
