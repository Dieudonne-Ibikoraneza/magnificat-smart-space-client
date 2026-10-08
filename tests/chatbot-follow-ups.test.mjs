import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
let language = "en";
let state = { data: [], loading: false, error: undefined, reload: () => {} };
const requests = [];
let buttons = [];
const locales = Object.fromEntries(["en", "rw"].map((lang) => [lang, JSON.parse(readFileSync(new URL(`../src/lib/i18n/locales/${lang}/common.json`, import.meta.url), "utf8"))]));
const t = (key, params = {}) => {
  const value = key.split(".").reduce((node, part) => node?.[part], locales[language.startsWith("rw") ? "rw" : "en"]);
  assert.equal(typeof value, "string", `missing translation: ${key}`);
  return value.replace(/{{(\w+)}}/g, (_, name) => params[name] ?? "");
};
const Button = ({ children, ...props }) => {
  buttons.push(props);
  return React.createElement("button", props, children);
};
const ui = new Proxy({}, { get: (_, name) => {
  if (name === "Button") return Button;
  if (name === "Badge") return function Badge({ children }) { return React.createElement("span", null, children); };
  if (name === "DialogContent") return () => null;
  if (name === "DialogTrigger") return ({ render, children }) => React.cloneElement(render, {}, children);
  return ({ children }) => React.createElement(React.Fragment, null, children);
} });
const load = (path, mocks) => {
  const target = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("exports", "require", "module", compiled)(target.exports, (name) => mocks[name] ?? require(name), target);
  return target.exports;
};
const endpointCalls = [];
const api = Object.fromEntries(["get", "post", "patch", "delete"].map((method) => [method, (...args) => {
  endpointCalls.push({ method, args });
  return Promise.resolve(state.data);
}]));
const { settingsApi } = load("../src/lib/api/endpoints.ts", { "./client": { api } });
const mocks = {
  "@/lib/use-sortable-list": load("../src/lib/use-sortable-list.ts", {}),
  "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
  "@/lib/api": { settingsApi },
  "@/lib/api/client": { ApiError: class extends Error {} },
  "@/lib/api/use-api": { useApi: (fetcher, deps) => { requests.push(deps); void fetcher(); return state; } },
  "react-i18next": { useTranslation: () => ({ t, i18n: { resolvedLanguage: language, language } }) },
  "@/components/api-state": {
    ApiLoading: () => React.createElement("span", null, "Loading"),
    ApiErrorState: ({ message, onRetry }) => React.createElement("div", { role: "alert" }, message, React.createElement(Button, { onClick: onRetry }, "Retry")),
  },
};
for (const name of ["button", "badge", "dialog", "field", "switch", "textarea"]) mocks[`@/components/ui/${name}`] = ui;
mocks["@/components/ui/toast"] = { toast: {} };
const { ChatbotFollowUpSuggestions } = load("../src/components/chatbot-follow-up-suggestions.tsx", mocks);
mocks["@/components/confirm-dialog"] = load("../src/components/confirm-dialog.tsx", mocks);
const { AdminChatbotFollowUps } = load("../src/components/admin-chatbot-follow-ups.tsx", mocks);
const renderSuggestions = (props = {}) => {
  buttons = [];
  return renderToStaticMarkup(React.createElement(ChatbotFollowUpSuggestions, { disabled: false, onSelect: () => {}, ...props }));
};

test("shows stored suggestions in server order and sends the exact customized text", () => {
  language = "en";
  state = { data: [{ id: "custom", text: "Ask about <marble> & {{budget}}?", position: 0 }, { id: "second", text: "A second custom question", position: 1 }], loading: false };
  const sent = [];
  const html = renderSuggestions({ onSelect: (text) => sent.push(text) });
  assert.match(html, /Ask about &lt;marble&gt; &amp; \{\{budget\}\}/);
  assert.ok(html.indexOf("Ask about") < html.indexOf("A second custom"));
  buttons[0].onClick();
  assert.deepEqual(sent, [state.data[0].text]);
  assert.deepEqual(endpointCalls.at(-1), { method: "get", args: ["/settings/follow-up-questions", { anonymous: true }] });
});

test("the same saved question is used when the interface language changes", () => {
  language = "rw-RW";
  state = { data: [{ id: "custom", text: "A single customized question?", position: 0 }], loading: false };
  assert.match(renderSuggestions(), /A single customized question/);
  assert.deepEqual(endpointCalls.at(-1).args[1], { anonymous: true });
});

test("hides an empty list without inventing hardcoded questions", () => {
  state = { data: [], loading: false };
  assert.equal(renderSuggestions(), "");
});

test("shows request errors and supports retry instead of static fallback questions", () => {
  let retries = 0;
  state = { loading: false, error: "Connection failed", reload: () => retries++ };
  const html = renderSuggestions();
  assert.match(html, /role="alert"/);
  assert.match(html, /Connection failed/);
  buttons[0].onClick();
  assert.equal(retries, 1);
});

test("does not send suggestions while the assistant is busy", () => {
  let sends = 0;
  state = { data: [{ id: "custom", text: "Custom question?", position: 0 }], loading: false };
  assert.match(renderSuggestions({ disabled: true, onSelect: () => sends++ }), /disabled/);
  buttons[0].onClick();
  assert.equal(sends, 0);
});

test("admin list shows single-text inactive questions with editing, deleting and ordering controls", () => {
  language = "en";
  state = { data: [{ id: "custom", text: "English?", position: 0, isActive: false }], loading: false, refreshing: false };
  const html = renderToStaticMarkup(React.createElement(AdminChatbotFollowUps));
  assert.match(html, /English\?/);
  assert.doesNotMatch(html, /Kinyarwanda\?|RW:/);
  assert.match(html, /Delete question/);
  assert.match(html, /Inactive/);
  assert.match(html, /Edit follow-up/);
  assert.match(html, /data-sortable-id="custom"/);
  assert.match(html, /data-sortable-handle="custom"/);
  assert.match(html, /<table/);
  assert.doesNotMatch(html, /Move up|Move down/);
  assert.deepEqual(endpointCalls.at(-1), { method: "get", args: ["/settings/follow-up-questions/admin"] });
});

test("admin API calls preserve text, status, full list ordering and deletion", async () => {
  const body = { text: "Edited EN?", isActive: false };
  await settingsApi.createFollowUpQuestion(body);
  assert.deepEqual(endpointCalls.at(-1), { method: "post", args: ["/settings/follow-up-questions", body] });
  await settingsApi.updateFollowUpQuestion("custom", body);
  assert.deepEqual(endpointCalls.at(-1), { method: "patch", args: ["/settings/follow-up-questions/custom", body] });
  await settingsApi.reorderFollowUpQuestions(["second", "custom"]);
  assert.deepEqual(endpointCalls.at(-1), { method: "patch", args: ["/settings/follow-up-questions/reorder", { ids: ["second", "custom"] }] });
  await settingsApi.deleteFollowUpQuestion("custom");
  assert.deepEqual(endpointCalls.at(-1), { method: "delete", args: ["/settings/follow-up-questions/custom"] });
});

test("the admin controls have complete English and Kinyarwanda translations", () => {
  const en = locales.en.admin.systemSettings.followUps;
  const rw = locales.rw.admin.systemSettings.followUps;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(rw).sort());
  for (const value of [...Object.values(en), ...Object.values(rw)]) assert.ok(value.trim().length > 0);
});
