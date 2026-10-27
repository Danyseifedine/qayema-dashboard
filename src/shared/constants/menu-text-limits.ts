/**
 * The most characters each piece of menu text may have, in every language:
 * what a menu really prints, with room to spare. The twin of
 * ../qayema/app/Support/MenuTextLimits.php: change one, change both. Text
 * saved before a limit was lowered still shows; the form asks for it
 * shorter the next time it is edited.
 */
export const MENU_TEXT_LIMITS = {
  dishName: 60,
  ingredients: 300,
  categoryName: 40,
  categoryDescription: 120,
  restaurantName: 60,
  restaurantDescription: 200,
  /** A variant, one of its options or an add-on. */
  choiceName: 40,
  offerTitle: 60,
  offerDescription: 200,
} as const
