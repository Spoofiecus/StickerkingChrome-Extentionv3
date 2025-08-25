import { ROLL_WIDTH, BLEED, MIN_PRICE_PER_STICKER } from './config.js';

export function calculatePrice(width, height, vinylCost) {
  const W = parseFloat(width);
  const H = parseFloat(height);

  if (isNaN(W) || isNaN(H) || W <= 0 || H <= 0) {
    return { price: 'Invalid dimensions', stickersPerRow: 0 };
  }

  // Horizontal Orientation
  const W_bleed_horizontal = W + BLEED;
  const S_raw_horizontal = ROLL_WIDTH / W_bleed_horizontal;
  const S_rounded_horizontal = Math.floor(S_raw_horizontal);
  const H_meters_horizontal = H / 1000;
  const Area_horizontal = (ROLL_WIDTH / 1000) * H_meters_horizontal;
  const Row_Cost_horizontal = Area_horizontal * vinylCost;
  const P_horizontal = S_rounded_horizontal > 0 ? Row_Cost_horizontal / S_rounded_horizontal : Infinity;

  // Vertical Orientation
  const H_bleed_vertical = H + BLEED;
  const S_raw_vertical = ROLL_WIDTH / H_bleed_vertical;
  const S_rounded_vertical = Math.floor(S_raw_vertical);
  const W_meters_vertical = W / 1000;
  const Area_vertical = (ROLL_WIDTH / 1000) * W_meters_vertical;
  const Row_Cost_vertical = Area_vertical * vinylCost;
  const P_vertical = S_rounded_vertical > 0 ? Row_Cost_vertical / S_rounded_vertical : Infinity;

  const price = Math.min(P_horizontal, P_vertical);
  const adjustedPrice = Math.max(price, MIN_PRICE_PER_STICKER);
  const stickersPerRow = price < P_vertical ? S_rounded_horizontal : S_rounded_vertical;

  return { price: adjustedPrice.toFixed(2), stickersPerRow };
}
