import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePiecesPerBox,
  isDecimalInput,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidSku,
  validateNewProduct,
} from "../src/lib/product-validation.ts";

const validProduct = {
  imageSelected: true,
  name: "Floor tile",
  sku: "GFT44063T",
  collectionSelected: true,
  roomTypeCount: 1,
  price: "22000",
  boxCoverage: "1.44",
  tileArea: 0.36,
  quantity: "12.5",
  costPrice: "15000",
  description: "A durable tile for the floor.",
};

test("numeric editing accepts decimals and clearing while rejecting nonnumeric typing and paste", () => {
  for (const value of ["", ".", "0", "22000", "0.", "0.5", ".5", "1.44"]) assert.equal(isDecimalInput(value), true, value);
  for (const value of ["asdfasdf", "1982-2938139", "-1", "+1", "1e3", "1.2.3", "12abc", " 12 ", "1,2"]) assert.equal(isDecimalInput(value), false, value);
  // Intermediate edits remain invalid for saving until they contain a positive amount.
  assert.equal(isPositiveNumber("."), false);
  assert.equal(isPositiveNumber(""), false);
});

test("rejects malformed, negative, non-finite, and non-decimal amounts", () => {
  for (const value of ["", " ", "-1", "1982-2938139", "1.2.3", "12abc", "Infinity", "NaN", "1e3", "0x10", "1,000", "1 000", "+1", "9".repeat(400)]) {
    assert.equal(isPositiveNumber(value), false, value);
    assert.equal(isNonNegativeNumber(value), false, value);
  }
});

test("accepts finite decimals, including fractional coverage and opening stock", () => {
  for (const value of ["22000", "1.44", ".5", "0.001", " 12.5 "]) {
    assert.equal(isPositiveNumber(value), true, value);
    assert.equal(isNonNegativeNumber(value), true, value);
  }
  assert.equal(isPositiveNumber("0"), false);
  assert.equal(isNonNegativeNumber("0"), true);
});

test("derives positive pieces and rejects unusable coverage or tile area", () => {
  assert.equal(calculatePiecesPerBox("1.44", 0.36), 4);
  assert.equal(calculatePiecesPerBox("0.3", 0.1), 3);
  assert.equal(calculatePiecesPerBox("1.45", 0.36), 4);
  for (const [coverage, area] of [["0.01", 0.36], ["0.1", 0.36], ["0", 0.36], ["1-2", 0.36], ["1", 0], ["1", null], ["1", Infinity]]) {
    assert.equal(calculatePiecesPerBox(coverage, area), null);
  }
});

test("reports every missing required field on an empty form", () => {
  const errors = validateNewProduct({ ...validProduct, imageSelected: false, name: "", sku: "", collectionSelected: false, roomTypeCount: 0, price: "", boxCoverage: "", tileArea: null, quantity: "", costPrice: "", description: "" });
  assert.deepEqual(errors.map(({ field }) => field), ["image", "name", "sku", "collection", "roomTypes", "price", "boxCoverage", "quantity", "description"]);
});

test("requires cost for positive opening stock, permits empty cost only with zero stock", () => {
  assert.deepEqual(validateNewProduct(validProduct), []);
  assert.deepEqual(validateNewProduct({ ...validProduct, quantity: "0", costPrice: "" }), []);
  for (const costPrice of ["", "0", "-5", "1982-2938139", "Infinity"]) {
    assert.equal(validateNewProduct({ ...validProduct, costPrice })[0]?.field, "costPrice");
  }
  assert.equal(validateNewProduct({ ...validProduct, quantity: "0", costPrice: "1982-2938139" })[0]?.field, "costPrice");
});

test("invalid numeric fields are reported together and never accepted for saving", () => {
  const errors = validateNewProduct({ ...validProduct, price: "-10", boxCoverage: "1.2.3", quantity: "Infinity", costPrice: "1982-2938139" });
  assert.deepEqual(errors.map(({ field }) => field), ["price", "boxCoverage", "quantity", "costPrice"]);
  assert.equal(validateNewProduct({ ...validProduct, boxCoverage: "0.1" })[0]?.messageKey, "stock.newProduct.boxCoveragePiecesError");
});

test("validates both plain and segmented SKU codes before availability checks", () => {
  assert.equal(isValidSku("GFT44063T"), true);
  assert.equal(isValidSku("SLB-CG-001"), true);
  for (const sku of ["", "AB", "AB--CD", "AB CD", "ABC-", "lowercase", "A".repeat(25)]) assert.equal(isValidSku(sku), false, sku);
});
