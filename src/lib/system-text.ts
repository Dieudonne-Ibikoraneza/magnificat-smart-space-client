/**
 * Automatic texts the server (and the cart chat) write in English into
 * negotiation threads and item chips. They are stored once, in English, but
 * read by customers and staff in either language — so they are recognised here
 * and shown in the viewer's own language. Anything that doesn't match (a
 * message somebody typed, a text this doesn't know) is returned untouched.
 *
 * The English wording below must mirror what the server writes:
 *   orders.service.ts            — order thread messages, the "tried to place an order" message
 *   cart-negotiations.service.ts — "Cart couldn't be fully covered…", the cleared note, item notes
 *   cart-negotiation-chat.tsx    — "Here's my current cart."
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

const EXACT: Record<string, string> = {
  "The customer cleared their chat view. The earlier conversation is kept here as a record.":
    "systemText.customerCleared",
  "Here's my current cart.": "systemText.shareCart",
  "Part of this order exceeds what is currently on hand. Our stock team will confirm what can be released now and when the rest can follow.":
    "systemText.orderPartlyShort",
  "The order was updated, but part of the revised quantity is still waiting on stock.":
    "systemText.orderUpdatedStillShort",
  "The order was updated and remains on the waitlist — it will be promoted, in order, as soon as stock is available.":
    "systemText.orderUpdatedWaitlisted",
  "The order quantities were updated by the stock team. The quotation will be prepared again for the revised order.":
    "systemText.orderUpdatedRequote",
  "Exceeds what we currently have in stock": "systemText.exceedsStock",
  // Older wording of the message a blocked checkout used to post for the customer.
  "I tried to place an order for this cart, but part of it isn't available right now — let's work out the details.":
    "systemText.triedToOrderCart",
  "In stock": "product.stock.in_stock",
  "Low stock": "product.stock.low_stock",
  "Out of stock": "product.stock.out_of_stock",
};

/**
 * `Tile A (requested 5 sqm); Tile B (requested 3 sqm)` → the same list in the
 * viewer's language, or null if any part doesn't parse. Threads written by an
 * older version put the stock note inside the parentheses —
 * `Tile A (Low stock, requested 5 sqm)` — which is handled too.
 */
const translateItemList = (summary: string, t: Translate): string | null => {
  const parts = summary.split("; ");
  const translated: string[] = [];
  for (const part of parts) {
    const current = /^(.+) \(requested ([\d.,]+) sqm\)$/.exec(part);
    if (current) {
      translated.push(t("systemText.requestedItem", { name: current[1], area: current[2] }));
      continue;
    }
    const older = /^(.+) \((.+), requested ([\d.,]+) sqm\)$/.exec(part);
    if (!older) return null;
    translated.push(
      t("systemText.requestedItemWithNote", { name: older[1], note: localizeSystemText(older[2], t), area: older[3] }),
    );
  }
  return translated.join("; ");
};

export const localizeSystemText = (body: string, t: Translate): string => {
  const exactKey = EXACT[body];
  if (exactKey) return t(exactKey);

  const cartShort = /^Cart couldn't be fully covered by stock on hand: (.+)\.$/.exec(body);
  if (cartShort) {
    const items = translateItemList(cartShort[1], t);
    return items ? t("systemText.cartShort", { items }) : body;
  }

  const waitlisted =
    /^This order is waitlisted: part of it exceeds what's currently on hand\. We'll email you the moment there's enough stock(?: and hold it for you\. You'll then have |, and you'll have )(\d+) minutes(?: to complete payment once your quotation is sent| from then to complete payment)\.$/.exec(
      body,
    );
  if (waitlisted) return t("systemText.orderWaitlisted", { minutes: waitlisted[1] });

  const tried = /^I tried to place an order for (.+), but it's more than you have in stock\. Can you help\?$/.exec(body);
  if (tried) return t("systemText.triedToOrder", { names: tried[1] });

  const onHand = /^Only ([\d.,]+) m² on hand right now\.$/.exec(body);
  if (onHand) return t("systemText.onlyOnHand", { area: onHand[1] });

  return body;
};
