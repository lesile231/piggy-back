/**
 * Map app deep link generators (coordinate-based, per §3.2).
 * Falls back to web if app is not installed.
 */

export function googleMapsUrl(lat: number, lng: number, name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
}

export function naverMapUrl(lat: number, lng: number, name: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}?c=${lng},${lat},15,0,0,0,dh`;
}

export function kakaoMapUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/place,${lat},${lng}`;
}
