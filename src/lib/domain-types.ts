/** Localized collection shape consumed by storefront presentation components. */
export type Collection = {
  id: string;
  title: string;
  description: string;
  image: string;
  size: string;
};

/** Customer-supplied delivery details shared by cart and order components. */
export type DeliveryDetails = {
  contactName: string;
  phone: string;
  address: string;
  city: string;
  preferredDate?: string;
  notes?: string;
};
