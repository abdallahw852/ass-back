/**
 * Synonym sets for the Elasticsearch search analyzers.
 *
 * Each element is a comma-separated group of equivalent terms.
 * Because the synonym filter is configured as `updateable: true`,
 * the lists can be expanded without a full reindex — just close the
 * index, update settings, and re-open it.
 *
 * Guidelines:
 *  - Keep sets tight (strong synonyms, not vague relatives).
 *  - Add both singular and plural if stemming doesn't handle it.
 *  - Arabic synonyms share the same comma-separated format.
 */

/** English synonym sets */
export const EN_SYNONYMS: string[] = [
  // Electronics
  'mobile, cellphone, cell phone, smartphone',
  'laptop, notebook, netbook',
  'tablet, ipad',
  'tv, television, screen',
  'headphone, headset, earphone, earbuds',
  'charger, adapter, power adapter',
  'cable, wire, cord',
  'battery, power bank, powerbank',
  // Apparel
  't-shirt, tee, tshirt',
  'jeans, denim',
  'sneaker, trainer, athletic shoe',
  'jacket, coat',
  // Home & kitchen
  'sofa, couch, settee',
  'fridge, refrigerator',
  'blender, mixer',
  'lamp, light, light fixture',
  // General trade
  'box, carton, package, packaging',
  'bottle, flask, container',
  'organic, natural',
];

/** Arabic synonym sets */
export const AR_SYNONYMS: string[] = [
  // Electronics
  'هاتف, موبايل, جوال, تليفون',
  'حاسوب محمول, لابتوب, نوت بوك',
  'تلفاز, تلفزيون, شاشة',
  'شاحن, محول كهربائي',
  // Apparel
  'تي شيرت, قميص, تيشيرت',
  'جاكيت, معطف',
  // Home & kitchen
  'ثلاجة, برادة',
  'مزج, خلاط',
  // General trade
  'كرتون, صندوق, عبوة',
];
