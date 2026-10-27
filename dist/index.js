(()=>{var RPS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/shared/application.ts
  var DEFAULT_APPLICATION_ID = "1563133363232055448";
  var APPLICATION_ID_PATTERN = /^\d{16,21}$/;
  function resolveApplicationId(value) {
    if (value === void 0 || value === "") return DEFAULT_APPLICATION_ID;
    if (!APPLICATION_ID_PATTERN.test(value)) throw new Error("Application ID \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C 16\u201321 \u0446\u0438\u0444\u0440\u0443. \u041E\u0441\u0442\u0430\u0432\u044C \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C \u0434\u043B\u044F \u043E\u0431\u0449\u0435\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F.");
    return value;
  }

  // src/shared/model.ts
  var MAX_PROFILES = 50;
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var EXPORT_FORMAT = "rich-presence-studio";
  var SCHEMA_VERSION = 1;
  var MAX_TEXT_LENGTH = 128;
  var MAX_PROFILE_LABEL_LENGTH = 60;
  var MAX_BUTTON_LABEL_LENGTH = 31;
  var MAX_URL_LENGTH = 512;
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var ASSET_KEY_PATTERN = /^[a-z0-9_-]{1,256}$/i;
  var CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
  var STRING_FIELDS = [
    "id",
    "label",
    "applicationId",
    "name",
    "details",
    "state",
    "largeImage",
    "largeText",
    "smallImage",
    "smallText"
  ];
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : void 0;
  }
  function newId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  function utf8Bytes(text) {
    let size = 0;
    for (const point of text) {
      const code = point.codePointAt(0);
      size += code <= 127 ? 1 : code <= 2047 ? 2 : code <= 65535 ? 3 : 4;
    }
    return size;
  }
  function truncate(value, length) {
    const sliced = value.slice(0, length);
    return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
  }
  function createProfile(label = "\u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C") {
    return {
      id: newId(),
      label: truncate(label.trim(), MAX_PROFILE_LABEL_LENGTH) || "\u041D\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C",
      applicationId: DEFAULT_APPLICATION_ID,
      name: "\u041C\u043E\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C",
      details: "",
      state: "",
      type: 0,
      largeImage: "",
      largeText: "",
      smallImage: "",
      smallText: "",
      buttons: [],
      timer: "none"
    };
  }
  function cloneProfile(profile) {
    const copy2 = sanitizeProfile(profile);
    copy2.id = newId();
    const suffix = " \u2014 \u043A\u043E\u043F\u0438\u044F";
    copy2.label = truncate(copy2.label, MAX_PROFILE_LABEL_LENGTH - suffix.length).trimEnd() + suffix;
    return copy2;
  }
  function privateHost(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    if (host.startsWith("[")) {
      const address = host.slice(1, -1);
      return !/^[23][0-9a-f]{0,3}:/.test(address) || address.startsWith("2001:db8:");
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b, c] = host.split(".").map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2)) || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113;
    }
    return !host.includes(".") || /(?:^|\.)(?:localhost|local|localdomain|internal|lan|home|invalid|test|onion)$/.test(host);
  }
  function urlIssue(value, isImage) {
    if (value.length > MAX_URL_LENGTH) return `\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043D\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${MAX_URL_LENGTH} \u0437\u043D\u0430\u043A\u043E\u0432.`;
    if (value !== value.trim()) return "\u0423\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0431\u0435\u043B\u044B \u0432 \u043D\u0430\u0447\u0430\u043B\u0435 \u0438 \u043A\u043E\u043D\u0446\u0435 \u0441\u0441\u044B\u043B\u043A\u0438.";
    if (CONTROL_CHARACTERS.test(value)) return "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0435 \u0441\u0438\u043C\u0432\u043E\u043B\u044B.";
    let url;
    try {
      url = new URL(value);
    } catch {
      return "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u043B\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443, \u043D\u0430\u0447\u0438\u043D\u0430\u044E\u0449\u0443\u044E\u0441\u044F \u0441 https:// \u0438\u043B\u0438 http://.";
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0441\u044B\u043B\u043A\u0438 https:// \u0438 http://.";
    }
    if (url.username || url.password) return "\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C.";
    if (privateHost(url.hostname)) return "\u041D\u0443\u0436\u043D\u0430 \u043E\u0431\u0449\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430: \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0430\u0434\u0440\u0435\u0441\u0430 \u0434\u0440\u0443\u0433\u0438\u043C \u043B\u044E\u0434\u044F\u043C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.";
    if (isImage && /^(?:cdn|media)\.discordapp\.(?:com|net)$/i.test(url.hostname)) {
      return "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 Art Asset, \u0430 \u043D\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0432\u043B\u043E\u0436\u0435\u043D\u0438\u0435 Discord.";
    }
    if (isImage && /^(?:www\.)?imgur\.com$/i.test(url.hostname)) {
      return "\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u044F\u043C\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443: i.imgur.com, \u0430 \u043D\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 Imgur.";
    }
    if (isImage && /^(?:www\.)?tenor\.com$/i.test(url.hostname)) {
      return "\u041D\u0443\u0436\u043D\u0430 \u043F\u0440\u044F\u043C\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443: media.tenor.com, \u0430 \u043D\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 Tenor.";
    }
    return void 0;
  }
  function validateProfile(profile, options = {}) {
    const issues = [];
    const add = (field, message) => issues.push({ field, message });
    if (!isRecord(profile)) return [{ field: "profile", message: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C." }];
    for (const field of STRING_FIELDS) {
      if (typeof own(profile, field) !== "string") add(field, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439.");
    }
    if (issues.length) return issues;
    if (!UUID_PATTERN.test(profile.id)) add("id", "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043F\u0440\u043E\u0444\u0438\u043B\u044F.");
    if (!profile.label.trim()) add("label", "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F.");
    if (profile.label.length > MAX_PROFILE_LABEL_LENGTH) add("label", `\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F: \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_PROFILE_LABEL_LENGTH} \u0437\u043D\u0430\u043A\u043E\u0432.`);
    if (profile.applicationId && !APPLICATION_ID_PATTERN.test(profile.applicationId)) {
      add("applicationId", "Application ID \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C 16\u201321 \u0446\u0438\u0444\u0440\u0443. \u0415\u0441\u043B\u0438 \u0441\u0432\u043E\u0435\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043D\u0435\u0442, \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u043E\u043B\u0435 \u043F\u0443\u0441\u0442\u044B\u043C.");
    }
    for (const field of ["label", "name", "details", "state", "largeText", "smallText"]) {
      if (CONTROL_CHARACTERS.test(profile[field])) add(field, "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043E\u0434\u043D\u0443 \u0441\u0442\u0440\u043E\u043A\u0443 \u0431\u0435\u0437 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0449\u0438\u0445 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.");
      if (field !== "label" && profile[field].length > MAX_TEXT_LENGTH) add(field, `\u041D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_TEXT_LENGTH} \u0437\u043D\u0430\u043A\u043E\u0432.`);
    }
    if (options.forApply && !profile.name.trim()) add("name", "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u043F\u0435\u0440\u0435\u0434 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C.");
    if (![0, 2, 3, 5].includes(profile.type)) add("type", "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0442\u0438\u043F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438.");
    if (profile.timer !== "none" && profile.timer !== "elapsed") add("timer", "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0442\u0430\u0439\u043C\u0435\u0440\u0430.");
    for (const field of ["largeImage", "smallImage"]) {
      const value = profile[field];
      if (!value) continue;
      if (/^https?:\/\//i.test(value)) {
        const message = urlIssue(value, true);
        if (message) add(field, message);
      } else if (!ASSET_KEY_PATTERN.test(value)) {
        add(field, "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u044F\u043C\u0443\u044E http(s)-\u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 Art Asset: \u043B\u0430\u0442\u0438\u043D\u0441\u043A\u0438\u0435 \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, _ \u0438 - (\u0434\u043E 256 \u0437\u043D\u0430\u043A\u043E\u0432).");
      }
    }
    if (!Array.isArray(profile.buttons)) {
      add("buttons", "\u041A\u043D\u043E\u043F\u043A\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C.");
    } else if (profile.buttons.length > 2) {
      add("buttons", "Discord \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u0434\u0432\u0443\u0445 \u043A\u043D\u043E\u043F\u043E\u043A.");
    } else {
      profile.buttons.forEach((button, index) => {
        const path = `buttons.${index}`;
        if (!isRecord(button) || typeof own(button, "label") !== "string" || typeof own(button, "url") !== "string") {
          add(path, "\u0414\u043B\u044F \u043A\u043D\u043E\u043F\u043A\u0438 \u043D\u0443\u0436\u043D\u044B \u0441\u0442\u0440\u043E\u043A\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044F label \u0438 url.");
          return;
        }
        if (button.label.length > MAX_BUTTON_LABEL_LENGTH) add(`${path}.label`, `\u0422\u0435\u043A\u0441\u0442 \u043A\u043D\u043E\u043F\u043A\u0438: \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_BUTTON_LABEL_LENGTH} \u0437\u043D\u0430\u043A\u0430.`);
        if (CONTROL_CHARACTERS.test(button.label)) add(`${path}.label`, "\u0422\u0435\u043A\u0441\u0442 \u043A\u043D\u043E\u043F\u043A\u0438 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0434\u043D\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u043E\u0439.");
        if (button.url) {
          const message = urlIssue(button.url, false);
          if (message) add(`${path}.url`, message);
        }
        if (options.forApply && Boolean(button.label.trim()) !== Boolean(button.url)) {
          add(path, "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0438 \u0442\u0435\u043A\u0441\u0442, \u0438 \u0441\u0441\u044B\u043B\u043A\u0443 \u043A\u043D\u043E\u043F\u043A\u0438 \u043B\u0438\u0431\u043E \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u0435 \u043E\u0431\u0430 \u043F\u043E\u043B\u044F.");
        }
      });
    }
    return issues;
  }
  function sanitizeProfile(value) {
    if (!isRecord(value)) throw new Error("\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C.");
    const profile = {};
    for (const field of STRING_FIELDS) {
      const fieldValue = own(value, field);
      if (typeof fieldValue !== "string") throw new Error(`\u041F\u043E\u043B\u0435 \xAB${field}\xBB \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0439.`);
      profile[field] = fieldValue;
    }
    profile.type = own(value, "type");
    profile.timer = own(value, "timer");
    const buttons = own(value, "buttons");
    if (!Array.isArray(buttons) || buttons.length > 2) throw new Error("\u041F\u043E\u043B\u0435 buttons \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u0434\u0432\u0443\u0445 \u043A\u043D\u043E\u043F\u043E\u043A.");
    profile.buttons = buttons.map((button) => {
      if (!isRecord(button) || typeof own(button, "label") !== "string" || typeof own(button, "url") !== "string") {
        throw new Error("\u041A\u0430\u0436\u0434\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0438\u043C\u0435\u0442\u044C \u0441\u0442\u0440\u043E\u043A\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044F label \u0438 url.");
      }
      return { label: own(button, "label"), url: own(button, "url") };
    });
    const issues = validateProfile(profile);
    if (issues.length) throw new Error(`${issues[0].field}: ${issues[0].message}`);
    return profile;
  }
  function parseImport(text, existingIds = []) {
    if (text.length > MAX_IMPORT_BYTES || utf8Bytes(text) > MAX_IMPORT_BYTES) {
      throw new Error("\u0424\u0430\u0439\u043B \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 1 \u041C\u0438\u0411.");
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C JSON. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 Rich Presence Studio.");
    }
    if (!isRecord(parsed) || own(parsed, "format") !== EXPORT_FORMAT || own(parsed, "version") !== SCHEMA_VERSION) {
      throw new Error("\u041D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0438\u043B\u0438 \u0432\u0435\u0440\u0441\u0438\u044F \u0444\u0430\u0439\u043B\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.");
    }
    const entries = own(parsed, "profiles");
    if (!Array.isArray(entries) || entries.length > MAX_PROFILES) {
      throw new Error(`\u0424\u0430\u0439\u043B \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432 \u0438\u0437 \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.`);
    }
    const profiles = entries.map((entry, index) => {
      try {
        return sanitizeProfile(entry);
      } catch (error) {
        throw new Error(`\u041F\u0440\u043E\u0444\u0438\u043B\u044C ${index + 1}: ${error instanceof Error ? error.message : "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435."}`);
      }
    });
    const reserved = new Set(existingIds);
    for (const profile of profiles) {
      reserved.add(profile.id);
    }
    for (const profile of profiles) {
      do {
        profile.id = newId();
      } while (reserved.has(profile.id));
      reserved.add(profile.id);
    }
    return profiles;
  }
  function serializeProfiles(profiles) {
    if (!Array.isArray(profiles) || profiles.length > MAX_PROFILES) {
      throw new Error(`\u041C\u043E\u0436\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.`);
    }
    return JSON.stringify({
      format: EXPORT_FORMAT,
      version: SCHEMA_VERSION,
      profiles: profiles.map(sanitizeProfile)
    }, null, 2);
  }

  // src/SyncPanel.tsx
  var { React, ReactNative: RN } = vendetta.metro.common;
  function SyncPanel({ sync: sync2 }) {
    const [code, setCode] = React.useState("");
    const [error, setError] = React.useState("");
    const [, refresh] = React.useState(0);
    React.useEffect(() => sync2.subscribe(() => refresh((n) => n + 1)), [sync2]);
    const button = (title, action) => /* @__PURE__ */ React.createElement(RN.Pressable, { accessibilityRole: "button", onPress: async () => {
      try {
        setError("");
        await action();
        refresh((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, style: { backgroundColor: "#5266c8", padding: 12, borderRadius: 8, marginVertical: 6 } }, /* @__PURE__ */ React.createElement(RN.Text, { style: { color: "white" } }, title));
    return /* @__PURE__ */ React.createElement(RN.View, { style: { marginVertical: 18 } }, /* @__PURE__ */ React.createElement(RN.Text, { style: { color: "white", fontSize: 20, fontWeight: "700" } }, "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E Wi-Fi"), /* @__PURE__ */ React.createElement(RN.Text, { style: { color: "#b6bbce", marginVertical: 8 } }, "\u041D\u0430 \u041F\u041A \u0432\u043A\u043B\u044E\u0447\u0438 Wi-Fi-\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435 RPS \u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u043A\u043E\u0434. \u0417\u0434\u0435\u0441\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0442\u043E\u0442 \u0436\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 Discord. \u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438."), /* @__PURE__ */ React.createElement(RN.TextInput, { accessibilityLabel: "\u0421\u0435\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u043A\u043E\u0434 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F", placeholder: "\u0412\u0441\u0442\u0430\u0432\u044C \u043A\u043E\u0434 \u0441 \u041F\u041A", placeholderTextColor: "#b6bbce", value: code, onChangeText: setCode, autoCapitalize: "none", autoCorrect: false, secureTextEntry: true, style: { color: "white", backgroundColor: "#252730", padding: 12, borderRadius: 8 } }), button("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C", async () => {
      await sync2.connect(code);
      setCode("");
    }), sync2.enabled() && button("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441", () => sync2.syncNow()), sync2.enabled() && button("\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E", () => sync2.disconnect()), /* @__PURE__ */ React.createElement(RN.Text, { accessibilityLiveRegion: "polite", style: { color: error ? "#ffacb5" : "#b6bbce" } }, error || sync2.status()));
  }

  // src/diagnostics.ts
  var BUILD = "0.2.7";
  var presence = "not-applied";
  function recordPresence(value) {
    presence = value;
  }
  var components = /* @__PURE__ */ new Set();
  var hooks = 0;
  var matches = 0;
  function observeComponent(element) {
    const type = element?.type;
    const name = type?.displayName || type?.name || type?.render?.name;
    if (typeof name === "string" && /profile|quest|shop|setting|actionbar|floating/i.test(name) && components.size < 80) components.add(name.slice(0, 100));
  }
  function setHookCount(value) {
    hooks = value;
  }
  function recordMatch() {
    matches++;
  }
  function diagnosticReport() {
    return JSON.stringify({ build: BUILD, hooks, matches, presence, components: [...components] }, null, 2);
  }

  // src/Settings.tsx
  var { React: React2, ReactNative: RN2 } = vendetta.metro.common;
  var { ScrollView, Text, TextInput, Pressable, Switch, View, Alert } = RN2;
  var colors = { background: "#17181d", panel: "#252730", text: "#f3f4fa", muted: "#b6bbce", accent: "#6476ee", error: "#ffacb5" };
  var styles = {
    heading: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 10 },
    text: { color: colors.text, fontSize: 15 },
    hint: { color: colors.muted, fontSize: 13, marginBottom: 10 },
    row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    input: { color: colors.text, backgroundColor: colors.panel, borderColor: "#535869", borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginTop: 6, marginBottom: 12 }
  };
  function Button({ title, onPress, selected = false, disabled = false, danger = false }) {
    return /* @__PURE__ */ React2.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: title,
        accessibilityState: { disabled, selected },
        disabled,
        onPress,
        style: { minHeight: 46, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: selected ? colors.accent : colors.panel, opacity: disabled ? 0.45 : 1 }
      },
      /* @__PURE__ */ React2.createElement(Text, { style: { color: danger ? colors.error : colors.text, fontSize: 15 } }, title)
    );
  }
  function Field({ label, value, onChange, placeholder = "", maxLength = 128, url = false, multiline = false }) {
    return /* @__PURE__ */ React2.createElement(View, null, /* @__PURE__ */ React2.createElement(Text, { style: styles.text }, label), /* @__PURE__ */ React2.createElement(
      TextInput,
      {
        accessibilityLabel: label,
        value,
        onChangeText: onChange,
        placeholder,
        placeholderTextColor: colors.muted,
        maxLength,
        multiline,
        autoCapitalize: url ? "none" : "sentences",
        autoCorrect: !url,
        keyboardType: url ? "url" : "default",
        selectionColor: colors.accent,
        style: [styles.input, multiline ? { minHeight: 160, textAlignVertical: "top" } : {}]
      }
    ));
  }
  function copy(profile) {
    return { ...profile, buttons: profile.buttons.map((button) => ({ ...button })) };
  }
  function Settings({ controller, sync: sync2 }) {
    const [snapshot, setSnapshot] = React2.useState(() => controller.getSnapshot());
    const [draft, setDraft] = React2.useState(() => copy(controller.getSnapshot().profiles[0] ?? createProfile()));
    const [baseline, setBaseline] = React2.useState(() => JSON.stringify(draft));
    const [error, setError] = React2.useState("");
    const [notice, setNotice] = React2.useState("");
    const [json, setJson] = React2.useState("");
    const dirty = JSON.stringify(draft) !== baseline;
    React2.useEffect(() => {
      const refresh = () => setSnapshot(controller.getSnapshot());
      const unsubscribe = controller.subscribe(refresh);
      refresh();
      return unsubscribe;
    }, [controller]);
    React2.useEffect(() => {
      const current = snapshot.profiles.find((profile) => profile.id === draft.id);
      if (JSON.stringify(draft) !== baseline) return;
      if (current && JSON.stringify(current) !== baseline) {
        setDraft(copy(current));
        setBaseline(JSON.stringify(current));
      } else if (!current) {
        const next = snapshot.profiles[0] ?? createProfile();
        setDraft(copy(next));
        setBaseline(JSON.stringify(next));
      }
    }, [snapshot.profiles]);
    async function run(action) {
      setError("");
      setNotice("");
      try {
        await action();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    }
    function select(profile) {
      setDraft(copy(profile));
      setBaseline(JSON.stringify(profile));
      setError("");
      setNotice("");
    }
    function replaceDraft(action) {
      if (!dirty) {
        void run(action);
        return;
      }
      Alert.alert("\u041D\u0435\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F", "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0432 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440\u0435?", [
        { text: "\u041E\u0441\u0442\u0430\u0442\u044C\u0441\u044F", style: "cancel" },
        { text: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F", style: "destructive", onPress: () => void run(action) }
      ]);
    }
    function patch(field2, value) {
      setDraft((current) => ({ ...current, [field2]: value }));
    }
    function save() {
      controller.saveProfile(draft);
      setBaseline(JSON.stringify(draft));
    }
    const field = (key, label, maxLength = 128, url = false, placeholder = "") => /* @__PURE__ */ React2.createElement(Field, { label, value: draft[key], onChange: (value) => patch(key, value), maxLength, url, placeholder });
    return /* @__PURE__ */ React2.createElement(ScrollView, { style: { backgroundColor: colors.background }, contentContainerStyle: { padding: 18, paddingBottom: 60 }, keyboardShouldPersistTaps: "handled" }, /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "Rich Presence Studio"), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u0421\u0431\u043E\u0440\u043A\u0430 ", BUILD), /* @__PURE__ */ React2.createElement(Button, { title: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0443 RPS", onPress: () => void run(() => {
      vendetta.metro.common.clipboard.setString(diagnosticReport());
      setNotice("\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0430. \u0412 \u043D\u0435\u0439 \u0432\u0435\u0440\u0441\u0438\u044F, \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u043E\u0432 \u0438 \u044D\u0442\u0430\u043F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438; \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439 \u0438 \u043A\u043E\u0434\u043E\u0432 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u043D\u0435\u0442.");
    }) }), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435. \u041C\u043E\u0436\u043D\u043E \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u043F\u043E Wi-Fi \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C JSON \u0432\u0440\u0443\u0447\u043D\u0443\u044E."), sync2 && /* @__PURE__ */ React2.createElement(SyncPanel, { sync: sync2 }), /* @__PURE__ */ React2.createElement(Text, { accessibilityLiveRegion: "polite", style: { color: snapshot.phase === "error" ? colors.error : colors.text, marginBottom: 12 } }, snapshot.message), !!error && /* @__PURE__ */ React2.createElement(Text, { accessibilityRole: "alert", accessibilityLiveRegion: "assertive", selectable: true, style: { color: colors.error, marginBottom: 12 } }, error), !!notice && /* @__PURE__ */ React2.createElement(Text, { accessibilityLiveRegion: "polite", style: styles.hint }, notice), !snapshot.sharingEnabled && /* @__PURE__ */ React2.createElement(Text, { style: { color: colors.error, marginBottom: 12 } }, "\u041F\u043E\u043A\u0430\u0437 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0432 Discord \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u0438\u043B\u0438 \u0435\u0433\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438."), snapshot.conflict && /* @__PURE__ */ React2.createElement(Text, { style: { color: colors.error, marginBottom: 12 } }, "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0430 \u0434\u0440\u0443\u0433\u0430\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C. \u041E\u0442\u043A\u043B\u044E\u0447\u0438 \u0435\u0451, \u0435\u0441\u043B\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0443\u044E\u0442."), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438"), /* @__PURE__ */ React2.createElement(View, { style: styles.row }, snapshot.profiles.map((profile) => /* @__PURE__ */ React2.createElement(
      Button,
      {
        key: profile.id,
        title: `${profile.label}${snapshot.activeProfile?.id === profile.id ? " \xB7 \u0430\u043A\u0442\u0438\u0432\u0435\u043D" : ""}`,
        selected: profile.id === draft.id,
        onPress: () => {
          if (profile.id !== draft.id) replaceDraft(() => select(profile));
        }
      }
    ))), /* @__PURE__ */ React2.createElement(View, { style: styles.row }, /* @__PURE__ */ React2.createElement(Button, { title: "\u041D\u043E\u0432\u044B\u0439", onPress: () => replaceDraft(() => select(createProfile())) }), /* @__PURE__ */ React2.createElement(Button, { title: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C", onPress: () => void run(() => {
      const next = cloneProfile(draft);
      controller.saveProfile(next);
      select(next);
    }) }), /* @__PURE__ */ React2.createElement(Button, { title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", danger: true, disabled: !snapshot.profiles.some((profile) => profile.id === draft.id), onPress: () => Alert.alert("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C?", `\xAB${draft.label}\xBB \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D. \u0415\u0441\u043B\u0438 \u043E\u043D \u0430\u043A\u0442\u0438\u0432\u0435\u043D, \u043F\u043E\u043A\u0430\u0437 \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F.`, [
      { text: "\u041E\u0442\u043C\u0435\u043D\u0430", style: "cancel" },
      { text: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: "destructive", onPress: () => void run(() => {
        controller.removeProfile(draft.id);
        select(controller.getSnapshot().profiles[0] ?? createProfile());
      }) }
    ]) })), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440", dirty ? " \xB7 \u0435\u0441\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" : ""), field("label", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", 60), field("name", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"), field("details", "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438"), field("state", "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435"), field("applicationId", "Application ID", 21, true, "\u041F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u2014 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435"), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 ID \u0443\u0436\u0435 \u0437\u0430\u0434\u0430\u043D \u0432 \u043D\u043E\u0432\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435. \u0414\u043B\u044F \u0441\u0432\u043E\u0438\u0445 Art Assets \u0443\u043A\u0430\u0436\u0438 ID \u0441\u0432\u043E\u0435\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F."), /* @__PURE__ */ React2.createElement(Text, { style: styles.text }, "\u0422\u0438\u043F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"), /* @__PURE__ */ React2.createElement(View, { style: [styles.row, { marginTop: 8 }] }, [[0, "\u0418\u0433\u0440\u0430\u0435\u0442"], [2, "\u0421\u043B\u0443\u0448\u0430\u0435\u0442"], [3, "\u0421\u043C\u043E\u0442\u0440\u0438\u0442"], [5, "\u0421\u043E\u0440\u0435\u0432\u043D\u0443\u0435\u0442\u0441\u044F"]].map(([value, label]) => /* @__PURE__ */ React2.createElement(Button, { key: value, title: label, selected: draft.type === value, onPress: () => patch("type", value) }))), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u0412\u0441\u0442\u0430\u0432\u044C \u043F\u0440\u044F\u043C\u0443\u044E http(s)-\u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 Art Asset. \u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0441\u0430\u0439\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442."), field("largeImage", "\u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: URL / \u043A\u043B\u044E\u0447", 512, true), field("largeText", "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), field("smallImage", "\u041C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: URL / \u043A\u043B\u044E\u0447", 512, true), field("smallText", "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u041A\u043D\u043E\u043F\u043A\u0438 \xB7 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 2"), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 emoji \u043C\u043E\u0436\u043D\u043E \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u044F\u043C\u043E \u0432 \u0442\u0435\u043A\u0441\u0442 \u043A\u043D\u043E\u043F\u043A\u0438. \u0417\u0430\u043F\u043E\u043B\u043D\u0438 \u0438 \u0442\u0435\u043A\u0441\u0442, \u0438 URL. \u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 Discord \u043C\u043E\u0436\u0435\u0442 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u0435\u0431\u0435."), draft.buttons.map((button, index) => /* @__PURE__ */ React2.createElement(View, { key: index, style: { marginBottom: 12 } }, /* @__PURE__ */ React2.createElement(Field, { label: `\u041A\u043D\u043E\u043F\u043A\u0430 ${index + 1}: emoji \u0438 \u0442\u0435\u043A\u0441\u0442`, value: button.label, maxLength: 31, onChange: (value) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, label: value } : item)) }), /* @__PURE__ */ React2.createElement(Field, { label: `\u041A\u043D\u043E\u043F\u043A\u0430 ${index + 1}: URL`, value: button.url, maxLength: 512, url: true, onChange: (value) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, url: value } : item)) }), /* @__PURE__ */ React2.createElement(Button, { title: `\u0423\u0431\u0440\u0430\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443 ${index + 1}`, danger: true, onPress: () => patch("buttons", draft.buttons.filter((_, i) => i !== index)) }))), /* @__PURE__ */ React2.createElement(Button, { title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443", disabled: draft.buttons.length >= 2, onPress: () => patch("buttons", [...draft.buttons, { label: "", url: "" }]) }), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u0422\u0430\u0439\u043C\u0435\u0440"), /* @__PURE__ */ React2.createElement(View, { style: styles.row }, /* @__PURE__ */ React2.createElement(Button, { title: "\u0411\u0435\u0437 \u0442\u0430\u0439\u043C\u0435\u0440\u0430", selected: draft.timer === "none", onPress: () => patch("timer", "none") }), /* @__PURE__ */ React2.createElement(Button, { title: "\u0421 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F", selected: draft.timer === "elapsed", onPress: () => patch("timer", "elapsed") })), draft.type === 5 && /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u0414\u043B\u044F \u0442\u0438\u043F\u0430 \xAB\u0421\u043E\u0440\u0435\u0432\u043D\u0443\u0435\u0442\u0441\u044F\xBB \u0442\u0430\u0439\u043C\u0435\u0440 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F."), /* @__PURE__ */ React2.createElement(View, { style: [styles.row, { marginTop: 18 }] }, /* @__PURE__ */ React2.createElement(Button, { title: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C", onPress: () => void run(save) }), /* @__PURE__ */ React2.createElement(Button, { title: snapshot.phase === "applying" ? "\u041F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F\u2026" : "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C", selected: true, disabled: snapshot.phase === "applying", onPress: () => void run(async () => {
      const applied = copy(draft);
      await controller.applyProfile(applied);
      setBaseline(JSON.stringify(applied));
    }) }), /* @__PURE__ */ React2.createElement(Button, { title: "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C", danger: true, onPress: () => void run(() => controller.disable()) })), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440. \xAB\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0432 Discord."), /* @__PURE__ */ React2.createElement(Text, { accessibilityLiveRegion: "polite", selectable: true, style: { color: error || snapshot.phase === "error" ? colors.error : colors.text, marginBottom: 12 } }, error || snapshot.message), /* @__PURE__ */ React2.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginVertical: 12 } }, /* @__PURE__ */ React2.createElement(Text, { style: [styles.text, { flex: 1 }] }, "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443"), /* @__PURE__ */ React2.createElement(Switch, { accessibilityLabel: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443", value: snapshot.restoreOnStart, onValueChange: (value) => void run(() => controller.setRestoreOnStart(value)) })), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0435\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435 Discord \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u0438\u0438 \u0438\u0437 \u0444\u043E\u043D\u0430. \u0415\u0441\u043B\u0438 Android \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442 Discord, \u043F\u043B\u0430\u0433\u0438\u043D \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044C \u043F\u043E\u043A\u0430\u0437 \u0434\u043E \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430."), /* @__PURE__ */ React2.createElement(Text, { style: styles.heading }, "\u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439"), /* @__PURE__ */ React2.createElement(Text, { style: styles.hint }, "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F. \u0418\u043C\u043F\u043E\u0440\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u0438, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435."), /* @__PURE__ */ React2.createElement(Field, { label: "JSON \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439", value: json, onChange: setJson, multiline: true, url: true, maxLength: 1048577, placeholder: "\u0412\u0441\u0442\u0430\u0432\u044C JSON \u0441 \u041F\u041A \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430" }), /* @__PURE__ */ React2.createElement(View, { style: styles.row }, /* @__PURE__ */ React2.createElement(Button, { title: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON", onPress: () => void run(() => {
      controller.importProfiles(json);
      setNotice("\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B. \u0412\u044B\u0431\u0435\u0440\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u0432\u044B\u0448\u0435.");
    }) }), /* @__PURE__ */ React2.createElement(Button, { title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442", onPress: () => void run(() => setJson(controller.exportProfiles())) }), /* @__PURE__ */ React2.createElement(Button, { title: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442", onPress: () => void run(async () => {
      const exported = controller.exportProfiles();
      setJson(exported);
      const clipboard = vendetta.metro.common.clipboard;
      if (!clipboard?.setString) throw new Error("\u0411\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 JSON \u0438\u0437 \u043F\u043E\u043B\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
      await clipboard.setString(exported);
      setNotice("\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430.");
    }) })));
  }
  var Settings_default = Settings;

  // src/shared/controllerCore.ts
  var APPLY_COOLDOWN_MS = 5e3;
  function copyProfile(profile) {
    return { ...profile, buttons: profile.buttons.map((button) => ({ ...button })) };
  }
  function errorText(error) {
    return error instanceof Error ? error.message : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C Rich Presence.";
  }
  function createStudioController(deps) {
    const listeners = /* @__PURE__ */ new Set();
    const now = deps.now ?? Date.now;
    let loaded = false;
    let running = false;
    let ownerId = null;
    let generation = 0;
    let lastPublishedAt = -Infinity;
    let startupRestoreChecked = false;
    let data;
    let snapshot = {
      profiles: [],
      activeProfile: null,
      restoreOnStart: false,
      phase: "idle",
      message: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430.",
      sharingEnabled: true,
      conflict: false
    };
    function update(patch) {
      snapshot = { ...snapshot, ...patch };
      listeners.forEach((listener) => listener());
    }
    function environment() {
      let sharingEnabled = false;
      let conflict = false;
      try {
        sharingEnabled = deps.getSharingEnabled();
      } catch {
      }
      try {
        conflict = deps.getConflict();
      } catch {
      }
      return { sharingEnabled, conflict };
    }
    function persist(next) {
      const owned = {
        ...next,
        profiles: next.profiles.map(copyProfile),
        lastApplied: next.lastApplied ? copyProfile(next.lastApplied) : null
      };
      deps.write(owned);
      data = owned;
    }
    function load() {
      if (loaded) return;
      const raw = deps.read();
      let message = "\u0412\u044B\u0431\u0435\u0440\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044C, \u043D\u0430\u0441\u0442\u0440\u043E\u0439 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0438 \u043D\u0430\u0436\u043C\u0438 \xAB\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C\xBB.";
      let profiles = [createProfile("\u041C\u043E\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C")];
      data = {
        version: 1,
        profiles,
        restoreOnStart: false,
        lastApplied: null,
        lastOwnerId: null,
        resumeEnabled: false
      };
      if (raw != null) {
        if (typeof raw !== "object" || raw.version !== 1)
          throw new Error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445. \u041D\u0435 \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0439 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438: \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E \u0438 \u043E\u0431\u043D\u043E\u0432\u0438 \u043F\u043B\u0430\u0433\u0438\u043D.");
        const saved = raw;
        if (!Array.isArray(saved.profiles) || saved.profiles.length > MAX_PROFILES)
          throw new Error("\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D. \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0435 \u0431\u044B\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B.");
        profiles = saved.profiles.map(sanitizeProfile);
        if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length)
          throw new Error("\u0412 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0442\u0441\u044F ID \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439. \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0435 \u0431\u044B\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B.");
        data = {
          version: 1,
          profiles,
          restoreOnStart: saved.restoreOnStart === true,
          lastApplied: saved.lastApplied ? sanitizeProfile(saved.lastApplied) : null,
          lastOwnerId: typeof saved.lastOwnerId === "string" ? saved.lastOwnerId : null,
          resumeEnabled: saved.resumeEnabled === true
        };
        if (data.restoreOnStart && data.resumeEnabled)
          message = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0431\u0443\u0434\u0435\u0442 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0433\u043E \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430.";
      }
      loaded = true;
      snapshot = {
        ...snapshot,
        profiles: data.profiles.map(copyProfile),
        restoreOnStart: data.restoreOnStart,
        message,
        ...environment()
      };
    }
    function saveProfile(profile) {
      load();
      const clean2 = sanitizeProfile(profile);
      const exists = data.profiles.some((item) => item.id === clean2.id);
      if (!exists && data.profiles.length >= MAX_PROFILES)
        throw new Error(`\u041C\u043E\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.`);
      const profiles = exists ? data.profiles.map((item) => item.id === clean2.id ? clean2 : item) : [...data.profiles, clean2];
      persist({ ...data, profiles });
      update({ profiles: profiles.map(copyProfile), message: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D. \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u0430\u0441\u044C." });
    }
    function clearPresence(message, preserveRestore) {
      ++generation;
      let storageFailure;
      if (loaded && !preserveRestore) {
        try {
          persist({ ...data, resumeEnabled: false });
        } catch (error) {
          storageFailure = error;
        }
      }
      try {
        deps.publish(null);
      } catch (error) {
        update({ phase: "error", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438 Discord.", ...environment() });
        throw error;
      }
      update({
        activeProfile: null,
        phase: storageFailure ? "error" : "idle",
        message: storageFailure ? "\u041F\u043E\u043A\u0430\u0437 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D, \u043D\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0430\u0432\u0442\u043E\u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B\u0430\u0441\u044C. \u041E\u0442\u043A\u043B\u044E\u0447\u0438 \u0430\u0432\u0442\u043E\u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0434 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C." : message,
        ...environment()
      });
      if (storageFailure) throw storageFailure;
    }
    function fail(message) {
      update({ phase: "error", message });
      throw new Error(message);
    }
    async function applyProfile(profile, saveDraft = true) {
      load();
      if (!running) fail("\u041F\u043B\u0430\u0433\u0438\u043D \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D \u0438\u043B\u0438 \u0443\u0436\u0435 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438 Discord.");
      const userId = deps.getUserId();
      if (!userId) fail("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0439\u0434\u0438 \u0432 \u0441\u0432\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 Discord.");
      if (ownerId && ownerId !== userId) {
        clearPresence("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041F\u0440\u0438\u043C\u0435\u043D\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", false);
      }
      ownerId = userId;
      let clean2;
      try {
        clean2 = sanitizeProfile(profile);
      } catch (error) {
        fail(errorText(error));
      }
      const issues = validateProfile(clean2, { forApply: true });
      if (issues.length) {
        const message = issues.map((issue) => issue.message).join(" ");
        fail(message);
      }
      const waitMs = APPLY_COOLDOWN_MS - (now() - lastPublishedAt);
      if (waitMs > 0) {
        const message = `\u041F\u043E\u0434\u043E\u0436\u0434\u0438 ${Math.ceil(waitMs / 1e3)} \u0441\u0435\u043A. \u043F\u0435\u0440\u0435\u0434 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u043C \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435\u043C.`;
        update({ message });
        throw new Error(message);
      }
      const request = ++generation;
      try {
        if (saveDraft) saveProfile(clean2);
        update({ phase: "applying", message: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443\u2026", ...environment() });
        const applicationId = resolveApplicationId(clean2.applicationId);
        const [large, small] = await Promise.all([
          clean2.largeImage.trim() ? deps.resolveAsset(applicationId, clean2.largeImage.trim()) : void 0,
          clean2.smallImage.trim() ? deps.resolveAsset(applicationId, clean2.smallImage.trim()) : void 0
        ]);
        if (request !== generation || !running) return;
        if (deps.getUserId() !== userId) {
          clearPresence("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041F\u0440\u0438\u043C\u0435\u043D\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", false);
          ownerId = deps.getUserId();
          return;
        }
        if (clean2.largeImage.trim() && !large)
          throw new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0431\u043E\u043B\u044C\u0448\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0440\u044F\u043C\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.");
        if (clean2.smallImage.trim() && !small)
          throw new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0440\u044F\u043C\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.");
        const activity = {
          application_id: applicationId,
          name: clean2.name.trim(),
          type: clean2.type,
          flags: 1
        };
        if (clean2.details.trim()) activity.details = clean2.details.trim();
        if (clean2.state.trim()) activity.state = clean2.state.trim();
        if (clean2.timer === "elapsed" && clean2.type !== 5)
          activity.timestamps = { start: now() };
        if (large || small) {
          activity.assets = {};
          if (large) {
            activity.assets.large_image = large;
            if (clean2.largeText.trim()) activity.assets.large_text = clean2.largeText.trim();
          }
          if (small) {
            activity.assets.small_image = small;
            if (clean2.smallText.trim()) activity.assets.small_text = clean2.smallText.trim();
          }
        }
        const buttons = clean2.buttons.filter((button) => button.label.trim() && button.url.trim());
        if (buttons.length) {
          activity.buttons = buttons.map((button) => button.label.trim());
          activity.metadata = { button_urls: buttons.map((button) => button.url.trim()) };
        }
        deps.publish(activity);
        lastPublishedAt = now();
        update({ activeProfile: copyProfile(clean2), phase: "active", message: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0443 Discord. \u0412\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u0434\u0440\u0443\u0433\u0438\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F\u043C \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430.", ...environment() });
        persist({ ...data, lastApplied: clean2, lastOwnerId: userId, resumeEnabled: true });
      } catch (error) {
        if (request !== generation || !running) return;
        const message = errorText(error);
        update({ phase: "error", message });
        throw new Error(message);
      }
    }
    function tryRestore() {
      if (startupRestoreChecked || !running) return;
      const userId = deps.getUserId();
      if (!userId) return;
      startupRestoreChecked = true;
      ownerId = userId;
      if (data.restoreOnStart && data.resumeEnabled && data.lastApplied) {
        if (data.lastOwnerId !== userId) {
          update({ message: "\u0410\u0432\u0442\u043E\u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: \u0432\u044B\u0431\u0440\u0430\u043D \u0434\u0440\u0443\u0433\u043E\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 Discord." });
          return;
        }
        void applyProfile(data.lastApplied, false).catch(() => {
        });
      }
    }
    return {
      replaceSyncedProfiles(profiles, expected) {
        load();
        if (JSON.stringify(data.profiles.map(sanitizeProfile)) !== JSON.stringify(expected.map(sanitizeProfile))) return false;
        if (profiles.length > MAX_PROFILES) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.");
        const next = profiles.map(sanitizeProfile);
        if (new Set(next.map((p) => p.id)).size !== next.length) throw new Error("\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0442\u0441\u044F ID \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.");
        if (JSON.stringify(next) === JSON.stringify(data.profiles)) return true;
        persist({ ...data, profiles: next });
        update({ profiles: next.map(copyProfile), message: "\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u044B. \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u0430\u0441\u044C." });
        return true;
      },
      getSnapshot() {
        load();
        return snapshot;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      saveProfile,
      removeProfile(id) {
        load();
        if (snapshot.activeProfile?.id === id) clearPresence("\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0443\u0434\u0430\u043B\u0451\u043D; \u043F\u043E\u043A\u0430\u0437 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D.", false);
        ++generation;
        const profiles = data.profiles.filter((profile) => profile.id !== id);
        persist({
          ...data,
          profiles,
          lastApplied: data.lastApplied?.id === id ? null : data.lastApplied,
          resumeEnabled: data.lastApplied?.id === id ? false : data.resumeEnabled
        });
        update({
          profiles: profiles.map(copyProfile),
          phase: snapshot.activeProfile ? "active" : "idle",
          message: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0443\u0434\u0430\u043B\u0451\u043D."
        });
      },
      applyProfile: (profile) => applyProfile(profile),
      disable() {
        load();
        clearPresence("\u041F\u043E\u043A\u0430\u0437 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D.", false);
      },
      setRestoreOnStart(restoreOnStart) {
        load();
        persist({ ...data, restoreOnStart });
        update({ restoreOnStart });
      },
      importProfiles(text) {
        load();
        const incoming = parseImport(text, data.profiles.map((profile) => profile.id));
        if (data.profiles.length + incoming.length > MAX_PROFILES)
          throw new Error(`\u041F\u043E\u0441\u043B\u0435 \u0438\u043C\u043F\u043E\u0440\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0441\u044F \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439. \u0423\u0434\u0430\u043B\u0438 \u043D\u0435\u043D\u0443\u0436\u043D\u044B\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438 \u0438\u043C\u043F\u043E\u0440\u0442.`);
        persist({ ...data, profiles: [...data.profiles, ...incoming] });
        update({ profiles: data.profiles.map(copyProfile), message: `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439: ${incoming.length}.` });
      },
      exportProfiles() {
        load();
        return serializeProfiles(data.profiles);
      },
      reportRuntimeError(message) {
        update({ phase: "error", message });
      },
      start() {
        load();
        if (running) return;
        running = true;
        ownerId = deps.getUserId();
        startupRestoreChecked = false;
        update(environment());
        tryRestore();
      },
      stop() {
        if (!loaded) return;
        running = false;
        clearPresence("\u041F\u043B\u0430\u0433\u0438\u043D \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D.", data.restoreOnStart);
      },
      onLogout() {
        if (!loaded) return;
        startupRestoreChecked = true;
        clearPresence("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u041F\u043E\u0441\u043B\u0435 \u0432\u0445\u043E\u0434\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", false);
        ownerId = null;
      },
      refreshEnvironment() {
        load();
        const userId = deps.getUserId();
        if (ownerId && ownerId !== userId) {
          startupRestoreChecked = true;
          clearPresence("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041F\u0440\u0438\u043C\u0435\u043D\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", false);
          ownerId = userId;
        }
        update(environment());
        tryRestore();
      }
    };
  }

  // src/runtime.ts
  var SOCKET_ID = "RichPresenceStudio@Revenge";
  var PID = 156313;
  function createRuntime(api) {
    const dispatcher = api.metro.common.FluxDispatcher;
    let lastActivity = null;
    let installed = false;
    let timer;
    let verification;
    let pendingLogout = false;
    let pendingReconnect = false;
    let appStateSubscription;
    const subscriptions = [];
    const user = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? null;
    function publish(activity) {
      const actions = api.metro.findByProps("SET_ACTIVITY");
      if (!actions?.SET_ACTIVITY || !dispatcher?.dispatch) {
        if (!activity && !lastActivity) return;
        throw new Error("\u042D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F Discord \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 API \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438. \u041E\u0431\u043D\u043E\u0432\u0438 Revenge/Discord \u0434\u043E \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438.");
      }
      dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID, pid: PID });
      lastActivity = activity;
      if (verification !== void 0) clearTimeout(verification);
      recordPresence(activity ? "dispatched" : "cleared");
      if (activity) verification = setTimeout(() => {
        verification = void 0;
        if (!installed || lastActivity !== activity) return;
        try {
          const store = api.metro.findByStoreName?.("SelfPresenceStore");
          if (typeof store?.getActivities !== "function") {
            recordPresence("verification-unavailable");
            return;
          }
          const activities = store.getActivities();
          if (!Array.isArray(activities)) {
            recordPresence("verification-unavailable");
            return;
          }
          const found = activities.some((item) => item?.application_id === activity.application_id && item?.name === activity.name && item?.type === activity.type);
          recordPresence(found ? "local-confirmed" : "local-missing");
          if (!found) controller.reportRuntimeError("Discord \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u043B \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0432 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438. \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0443 RPS; \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438 \u043D\u0435 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u044B.");
        } catch {
          recordPresence("verification-unavailable");
        }
      }, 1e3);
    }
    const controller = createStudioController({
      read: () => api.plugin.storage.studioData,
      write: (data) => {
        api.plugin.storage.studioData = data;
      },
      publish,
      getUserId: user,
      getSharingEnabled: () => true,
      getConflict: () => false,
      resolveAsset: async (appId, asset) => {
        const manager = api.metro.findByProps("fetchAssetIds");
        if (!manager?.fetchAssetIds) throw new Error("\u0412 \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 Discord \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A Rich Presence.");
        let timeout;
        try {
          const value = await Promise.race([
            manager.fetchAssetIds(appId, [asset]),
            new Promise((_, reject) => {
              timeout = setTimeout(() => reject(new Error("Discord \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u043F\u0440\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u0437\u0430 15 \u0441\u0435\u043A\u0443\u043D\u0434.")), 15e3);
            })
          ]);
          if (typeof value?.[0] !== "string" || !value[0]) throw new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u0423\u043A\u0430\u0436\u0438 \u043F\u0440\u044F\u043C\u0443\u044E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 Art Asset.");
          return value[0];
        } finally {
          if (timeout !== void 0) clearTimeout(timeout);
        }
      }
    });
    function error(e) {
      controller.reportRuntimeError(e instanceof Error ? e.message : "\u041E\u0448\u0438\u0431\u043A\u0430 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0439 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438.");
    }
    function schedule(logout, reconnect) {
      pendingLogout || (pendingLogout = logout);
      pendingReconnect || (pendingReconnect = reconnect);
      if (timer !== void 0) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = void 0;
        if (!installed) return;
        const logout2 = pendingLogout, reconnect2 = pendingReconnect;
        pendingLogout = pendingReconnect = false;
        try {
          if (logout2) controller.onLogout();
          else {
            controller.refreshEnvironment();
            if (reconnect2 && lastActivity && controller.getSnapshot().activeProfile) publish(lastActivity);
          }
        } catch (e) {
          error(e);
        }
      }, 0);
    }
    return {
      controller,
      start() {
        if (installed) return;
        installed = true;
        try {
          controller.start();
          appStateSubscription = api.metro.common.ReactNative?.AppState?.addEventListener?.("change", (state) => {
            if (state === "active" && controller.getSnapshot().restoreOnStart) schedule(false, true);
          });
          for (const [event, logout, reconnect] of [
            ["LOGOUT", true, false],
            ["CONNECTION_OPEN", false, true],
            ["CURRENT_USER_UPDATE", false, false]
          ]) {
            const handler = () => schedule(logout, reconnect);
            dispatcher.subscribe(event, handler);
            subscriptions.push([event, handler]);
          }
        } catch (e) {
          error(e);
        }
      },
      stop() {
        installed = false;
        appStateSubscription?.remove();
        appStateSubscription = void 0;
        if (timer !== void 0) clearTimeout(timer);
        if (verification !== void 0) clearTimeout(verification);
        for (const [event, handler] of subscriptions.splice(0)) dispatcher.unsubscribe(event, handler);
        try {
          controller.stop();
        } catch (e) {
          api.logger?.error?.(e);
        }
      }
    };
  }

  // src/shared/vendor/noble/utils.js
  /*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle = (title) => title ? `"${title}" ` : "";
  function abool(value, title = "") {
    if (typeof value !== "boolean")
      throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
    return value;
  }
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes(value, length, title = "") {
    if (isBytes(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber(length, "length");
    const bytes = isBytes(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function aoutput32(out, instance) {
    aoutput(out, instance);
    if (!isAligned32(out))
      throw new Error("invalid output, must be aligned");
  }
  function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function byteSwap(word) {
    return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
  }
  var swap8IfBE = isLE ? (n) => n : (n) => byteSwap(n) >>> 0;
  function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = byteSwap(arr[i]);
    }
    return arr;
  }
  var swap32IfBE = isLE ? (u) => u : byteSwap32;
  function equalBytes(a, b) {
    a = abytes(a);
    b = abytes(b);
    if (a.length !== b.length)
      return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function wrapMacConstructor(keyLen, macCons, fromMsg) {
    const mac = macCons;
    const getArgs = fromMsg || (() => []);
    const macC = (msg, key) => mac(key, ...getArgs(msg)).update(msg).digest();
    const tmp = mac(new Uint8Array(keyLen), ...getArgs(new Uint8Array(0)));
    macC.outputLen = tmp.outputLen;
    macC.blockLen = tmp.blockLen;
    macC.create = (key, ...args) => mac(key, ...args);
    return macC;
  }
  var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
    function wrappedCipher(key, ...args) {
      abytes(key, void 0, "key");
      if (params.nonceLength !== void 0) {
        const nonce = args[0];
        abytes(nonce, params.varSizeNonce ? void 0 : params.nonceLength, "nonce");
      }
      const tagl = params.tagLength;
      const aadStart = params.nonceLength !== void 0 ? 1 : 0;
      if (!params.withAAD) {
        for (let i = aadStart; i < args.length; i++)
          if (isBytes(args[i]))
            throw new Error("AAD not supported");
      }
      if (params.withAAD && args[aadStart] !== void 0)
        abytes(args[aadStart], void 0, "AAD");
      const cipher = constructor(key, ...args);
      const checkOutput = (fnLength, output) => {
        if (output !== void 0) {
          if (fnLength !== 2)
            throw new Error("cipher output not supported");
          abytes(output, void 0, "output");
        }
      };
      let called = false;
      const wrCipher = {
        encrypt(data, output) {
          if (called)
            throw new Error("cannot encrypt() twice with same key + nonce");
          called = true;
          abytes(data, void 0, "data");
          checkOutput(cipher.encrypt.length, output);
          return cipher.encrypt(data, output);
        },
        decrypt(data, output) {
          abytes(data, void 0, "data");
          if (tagl && data.length < tagl)
            throw new Error('"ciphertext" expected length >= tagLength=' + tagl);
          checkOutput(cipher.decrypt.length, output);
          return cipher.decrypt(data, output);
        }
      };
      return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
  };
  function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === void 0)
      return new Uint8Array(expectedLength);
    abytes(out, expectedLength, "output");
    if (onlyAligned && !isAligned32(out))
      throw new Error("invalid output, must be aligned");
    return out;
  }
  function u64Lengths(dataLength, aadLength, isLE2) {
    anumber(dataLength);
    anumber(aadLength);
    abool(isLE2);
    const num = new Uint8Array(16);
    const view = createView(num);
    view.setBigUint64(0, BigInt(aadLength), isLE2);
    view.setBigUint64(8, BigInt(dataLength), isLE2);
    return num;
  }
  function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(abytes(bytes));
  }

  // src/shared/vendor/noble/_polyval.js
  var BLOCK_SIZE = 16;
  var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
  var ZEROS32 = /* @__PURE__ */ u32(ZEROS16);
  var POLY = 225;
  var mul2 = (s0, s1, s2, s3) => {
    const hiBit = s3 & 1;
    return {
      s3: s2 << 31 | s3 >>> 1,
      s2: s1 << 31 | s2 >>> 1,
      s1: s0 << 31 | s1 >>> 1,
      // NIST SP 800-38D §6.3 applies `V >> 1` and XORs R on carry. In this
      // 4x32-bit split, R = 0xe1 || 0^120 lives in the top byte of s0.
      s0: s0 >>> 1 ^ POLY << 24 & -(hiBit & 1)
      // reduce % poly
    };
  };
  var swapLE = (n) => (n >>> 0 & 255) << 24 | (n >>> 8 & 255) << 16 | (n >>> 16 & 255) << 8 | n >>> 24 & 255 | 0;
  var swap8IfLE = (n) => swap8IfBE(swapLE(n));
  function _toGHASHKey(k) {
    k.reverse();
    const hiBit = k[15] & 1;
    let carry = 0;
    for (let i = 0; i < k.length; i++) {
      const t = k[i];
      k[i] = t >>> 1 | carry;
      carry = (t & 1) << 7;
    }
    k[0] ^= -hiBit & 225;
    return k;
  }
  var estimateWindow = (bytes) => {
    if (bytes > 64 * 1024)
      return 8;
    if (bytes > 1024)
      return 4;
    return 2;
  };
  var GHASH = class {
    // We select bits per window adaptively based on expectedLength
    constructor(key, expectedLength) {
      __publicField(this, "blockLen", BLOCK_SIZE);
      __publicField(this, "outputLen", BLOCK_SIZE);
      __publicField(this, "s0", 0);
      __publicField(this, "s1", 0);
      __publicField(this, "s2", 0);
      __publicField(this, "s3", 0);
      __publicField(this, "finished", false);
      __publicField(this, "destroyed", false);
      __publicField(this, "t");
      __publicField(this, "W");
      __publicField(this, "windowSize");
      abytes(key, 16, "key");
      key = copyBytes(key);
      const kView = createView(key);
      let k0 = kView.getUint32(0, false);
      let k1 = kView.getUint32(4, false);
      let k2 = kView.getUint32(8, false);
      let k3 = kView.getUint32(12, false);
      const doubles = [];
      for (let i = 0; i < 128; i++) {
        doubles.push({ s0: swapLE(k0), s1: swapLE(k1), s2: swapLE(k2), s3: swapLE(k3) });
        ({ s0: k0, s1: k1, s2: k2, s3: k3 } = mul2(k0, k1, k2, k3));
      }
      const W = estimateWindow(expectedLength || 1024);
      if (![1, 2, 4, 8].includes(W))
        throw new Error("ghash: invalid window size, expected 2, 4 or 8");
      this.W = W;
      const bits = 128;
      const windows = bits / W;
      const windowSize = this.windowSize = 2 ** W;
      const items = [];
      for (let w = 0; w < windows; w++) {
        for (let byte = 0; byte < windowSize; byte++) {
          let s0 = 0, s1 = 0, s2 = 0, s3 = 0;
          for (let j = 0; j < W; j++) {
            const bit = byte >>> W - j - 1 & 1;
            if (!bit)
              continue;
            const { s0: d0, s1: d1, s2: d2, s3: d3 } = doubles[W * w + j];
            s0 ^= d0, s1 ^= d1, s2 ^= d2, s3 ^= d3;
          }
          items.push({ s0, s1, s2, s3 });
        }
      }
      this.t = items;
    }
    _updateBlock(s0, s1, s2, s3) {
      s0 ^= this.s0, s1 ^= this.s1, s2 ^= this.s2, s3 ^= this.s3;
      const { W, t, windowSize } = this;
      let o0 = 0, o1 = 0, o2 = 0, o3 = 0;
      const mask = (1 << W) - 1;
      let w = 0;
      for (const num of [s0, s1, s2, s3]) {
        for (let bytePos = 0; bytePos < 4; bytePos++) {
          const byte = num >>> 8 * bytePos & 255;
          for (let bitPos = 8 / W - 1; bitPos >= 0; bitPos--) {
            const bit = byte >>> W * bitPos & mask;
            const { s0: e0, s1: e1, s2: e2, s3: e3 } = t[w * windowSize + bit];
            o0 ^= e0, o1 ^= e1, o2 ^= e2, o3 ^= e3;
            w += 1;
          }
        }
      }
      this.s0 = o0;
      this.s1 = o1;
      this.s2 = o2;
      this.s3 = o3;
    }
    update(data) {
      aexists(this);
      abytes(data);
      data = copyBytes(data);
      const b32 = u32(data);
      const blocks = Math.floor(data.length / BLOCK_SIZE);
      const left = data.length % BLOCK_SIZE;
      for (let i = 0; i < blocks; i++) {
        this._updateBlock(swap8IfBE(b32[i * 4 + 0]), swap8IfBE(b32[i * 4 + 1]), swap8IfBE(b32[i * 4 + 2]), swap8IfBE(b32[i * 4 + 3]));
      }
      if (left) {
        ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
        this._updateBlock(swap8IfBE(ZEROS32[0]), swap8IfBE(ZEROS32[1]), swap8IfBE(ZEROS32[2]), swap8IfBE(ZEROS32[3]));
        clean(ZEROS32);
      }
      return this;
    }
    destroy() {
      this.destroyed = true;
      const { t } = this;
      for (const elm of t) {
        elm.s0 = 0, elm.s1 = 0, elm.s2 = 0, elm.s3 = 0;
      }
    }
    digestInto(out) {
      aexists(this);
      aoutput32(out, this);
      this.finished = true;
      const { s0, s1, s2, s3 } = this;
      const o32 = u32(out);
      o32[0] = s0;
      o32[1] = s1;
      o32[2] = s2;
      o32[3] = s3;
      if (!isLE)
        swap32IfBE(o32.subarray(0, BLOCK_SIZE / 4));
    }
    digest() {
      const res = new Uint8Array(BLOCK_SIZE);
      this.digestInto(res);
      this.destroy();
      return res;
    }
  };
  var Polyval = class extends GHASH {
    constructor(key, expectedLength) {
      abytes(key);
      const ghKey = _toGHASHKey(copyBytes(key));
      super(ghKey, expectedLength);
      clean(ghKey);
    }
    update(data) {
      aexists(this);
      abytes(data);
      data = copyBytes(data);
      const b32 = u32(data);
      const left = data.length % BLOCK_SIZE;
      const blocks = Math.floor(data.length / BLOCK_SIZE);
      for (let i = 0; i < blocks; i++) {
        this._updateBlock(swap8IfLE(b32[i * 4 + 3]), swap8IfLE(b32[i * 4 + 2]), swap8IfLE(b32[i * 4 + 1]), swap8IfLE(b32[i * 4 + 0]));
      }
      if (left) {
        ZEROS16.set(data.subarray(blocks * BLOCK_SIZE));
        this._updateBlock(swap8IfLE(ZEROS32[3]), swap8IfLE(ZEROS32[2]), swap8IfLE(ZEROS32[1]), swap8IfLE(ZEROS32[0]));
        clean(ZEROS32);
      }
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput32(out, this);
      this.finished = true;
      const view = out.subarray(0, this.outputLen);
      const { s0, s1, s2, s3 } = this;
      const o32 = u32(view);
      o32[0] = s0;
      o32[1] = s1;
      o32[2] = s2;
      o32[3] = s3;
      swap32IfBE(o32);
      view.reverse();
    }
  };
  var polyval = /* @__PURE__ */ wrapMacConstructor(16, (key, expectedLength) => new Polyval(key, expectedLength), (msg) => [msg.length]);

  // src/shared/vendor/noble/aes.js
  var BLOCK_SIZE2 = 16;
  var BLOCK_SIZE32 = 4;
  var POLY2 = 283;
  function validateKeyLength(key) {
    if (![16, 24, 32].includes(key.length))
      throw new Error('"aes key" expected Uint8Array of length 16/24/32, got length=' + key.length);
  }
  function mul22(n) {
    return n << 1 ^ POLY2 & -(n >> 7);
  }
  function mul(a, b) {
    let res = 0;
    for (; b > 0; b >>= 1) {
      res ^= a & -(b & 1);
      a = mul22(a);
    }
    return res;
  }
  var sbox = /* @__PURE__ */ (() => {
    const t = new Uint8Array(256);
    for (let i = 0, x = 1; i < 256; i++, x ^= mul22(x))
      t[i] = x;
    const box = new Uint8Array(256);
    box[0] = 99;
    for (let i = 0; i < 255; i++) {
      let x = t[255 - i];
      x |= x << 8;
      box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
    }
    clean(t);
    return box;
  })();
  var rotr32_8 = (n) => n << 24 | n >>> 8;
  var rotl32_8 = (n) => n << 8 | n >>> 24;
  function genTtable(sbox2, fn) {
    if (sbox2.length !== 256)
      throw new Error("wrong sbox length");
    const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
    const T1 = T0.map(rotl32_8);
    const T2 = T1.map(rotl32_8);
    const T3 = T2.map(rotl32_8);
    const T01 = new Uint32Array(256 * 256);
    const T23 = new Uint32Array(256 * 256);
    const sbox22 = new Uint16Array(256 * 256);
    for (let i = 0; i < 256; i++) {
      for (let j = 0; j < 256; j++) {
        const idx = i * 256 + j;
        T01[idx] = T0[i] ^ T1[j];
        T23[idx] = T2[i] ^ T3[j];
        sbox22[idx] = sbox2[i] << 8 | sbox2[j];
      }
    }
    return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
  }
  var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2));
  var xPowers = /* @__PURE__ */ (() => {
    const p = new Uint8Array(16);
    for (let i = 0, x = 1; i < 16; i++, x = mul22(x))
      p[i] = x;
    return p;
  })();
  function expandKeyLE(key) {
    abytes(key);
    const len = key.length;
    validateKeyLength(key);
    const { sbox2 } = tableEncoding;
    const toClean = [];
    if (!isLE || !isAligned32(key))
      toClean.push(key = copyBytes(key));
    const k32 = swap32IfBE(u32(key));
    const Nk = k32.length;
    const subByte = (n) => applySbox(sbox2, n, n, n, n);
    const xk = new Uint32Array(len + 28);
    xk.set(k32);
    for (let i = Nk; i < xk.length; i++) {
      let t = xk[i - 1];
      if (i % Nk === 0)
        t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
      else if (Nk > 6 && i % Nk === 4)
        t = subByte(t);
      xk[i] = xk[i - Nk] ^ t;
    }
    clean(...toClean);
    return xk;
  }
  function apply0123(T01, T23, s0, s1, s2, s3) {
    return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
  }
  function applySbox(sbox2, s0, s1, s2, s3) {
    return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
  }
  function encrypt(xk, s0, s1, s2, s3) {
    const { sbox2, T01, T23 } = tableEncoding;
    let k = 0;
    s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
    const rounds = xk.length / 4 - 2;
    for (let i = 0; i < rounds; i++) {
      const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
      const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
      const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
      const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
      s0 = t02, s1 = t12, s2 = t22, s3 = t32;
    }
    const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
    const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
    const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
    const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
    return { s0: t0, s1: t1, s2: t2, s3: t3 };
  }
  function ctr32(xk, isLE2, nonce, src, dst) {
    abytes(nonce, BLOCK_SIZE2, "nonce");
    abytes(src);
    dst = getOutput(src.length, dst);
    const ctr = nonce;
    const c32 = u32(ctr);
    const view = createView(ctr);
    const src32 = u32(src);
    const dst32 = u32(dst);
    const ctrPos = isLE2 ? 0 : 12;
    const srcLen = src.length;
    let ctrNum = view.getUint32(ctrPos, isLE2);
    for (let i = 0; i + 4 <= src32.length; i += 4) {
      const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
      dst32[i + 0] = src32[i + 0] ^ swap8IfBE(s0);
      dst32[i + 1] = src32[i + 1] ^ swap8IfBE(s1);
      dst32[i + 2] = src32[i + 2] ^ swap8IfBE(s2);
      dst32[i + 3] = src32[i + 3] ^ swap8IfBE(s3);
      ctrNum = ctrNum + 1 >>> 0;
      view.setUint32(ctrPos, ctrNum, isLE2);
    }
    const start = BLOCK_SIZE2 * Math.floor(src32.length / BLOCK_SIZE32);
    if (start < srcLen) {
      const { s0, s1, s2, s3 } = encrypt(xk, swap8IfBE(c32[0]), swap8IfBE(c32[1]), swap8IfBE(c32[2]), swap8IfBE(c32[3]));
      const b32 = new Uint32Array([s0, s1, s2, s3]);
      swap32IfBE(b32);
      const buf = u8(b32);
      for (let i = start, pos = 0; i < srcLen; i++, pos++)
        dst[i] = src[i] ^ buf[pos];
      clean(b32);
    }
    return dst;
  }
  function computeTag(fn, isLE2, key, data, AAD) {
    const aadLength = AAD ? AAD.length : 0;
    const h = fn.create(key, data.length + aadLength);
    if (AAD)
      h.update(AAD);
    const num = u64Lengths(8 * data.length, 8 * aadLength, isLE2);
    h.update(data);
    h.update(num);
    const res = h.digest();
    clean(num);
    return res;
  }
  var limit = (name, min, max) => (value) => {
    if (!Number.isSafeInteger(value) || min > value || value > max) {
      const minmax = "[" + min + ".." + max + "]";
      throw new Error("" + name + ": expected value in range " + minmax + ", got " + value);
    }
  };
  var gcmsiv = /* @__PURE__ */ wrapCipher({ blockSize: 16, nonceLength: 12, tagLength: 16, withAAD: true, varSizeNonce: true }, function aessiv(key, nonce, AAD) {
    const tagLength = 16;
    const AAD_LIMIT = limit("AAD", 0, 2 ** 36);
    const PLAIN_LIMIT = limit("plaintext", 0, 2 ** 36);
    const NONCE_LIMIT = limit("nonce", 12, 12);
    const CIPHER_LIMIT = limit("ciphertext", 16, 2 ** 36 + 16);
    abytes(key);
    validateKeyLength(key);
    NONCE_LIMIT(nonce.length);
    if (AAD !== void 0)
      AAD_LIMIT(AAD.length);
    function deriveKeys() {
      const xk = expandKeyLE(key);
      const encKey = new Uint8Array(key.length);
      const authKey = new Uint8Array(16);
      const toClean = [xk, encKey];
      let _nonce = nonce;
      if (!isLE || !isAligned32(_nonce))
        toClean.push(_nonce = copyBytes(_nonce));
      const n32 = u32(_nonce);
      swap32IfBE(n32);
      let s0 = 0, s1 = n32[0], s2 = n32[1], s3 = n32[2];
      let counter = 0;
      for (const derivedKey of [authKey, encKey].map(u32)) {
        const d32 = u32(derivedKey);
        for (let i = 0; i < d32.length; i += 2) {
          const { s0: o0, s1: o1 } = encrypt(xk, s0, s1, s2, s3);
          d32[i + 0] = o0;
          d32[i + 1] = o1;
          s0 = ++counter;
        }
        swap32IfBE(d32);
      }
      const res = { authKey, encKey: expandKeyLE(encKey) };
      clean(...toClean);
      return res;
    }
    function _computeTag(encKey, authKey, data) {
      const tag = computeTag(polyval, true, authKey, data, AAD);
      for (let i = 0; i < 12; i++)
        tag[i] ^= nonce[i];
      tag[15] &= 127;
      const t32 = u32(tag);
      swap32IfBE(t32);
      let s0 = t32[0], s1 = t32[1], s2 = t32[2], s3 = t32[3];
      ({ s0, s1, s2, s3 } = encrypt(encKey, s0, s1, s2, s3));
      t32[0] = s0, t32[1] = s1, t32[2] = s2, t32[3] = s3;
      swap32IfBE(t32);
      return tag;
    }
    function processSiv(encKey, tag, input) {
      let block = copyBytes(tag);
      block[15] |= 128;
      const res = ctr32(encKey, true, block, input);
      clean(block);
      return res;
    }
    return {
      encrypt(plaintext) {
        PLAIN_LIMIT(plaintext.length);
        const { encKey, authKey } = deriveKeys();
        const tag = _computeTag(encKey, authKey, plaintext);
        const toClean = [encKey, authKey, tag];
        if (!isAligned32(plaintext))
          toClean.push(plaintext = copyBytes(plaintext));
        const out = new Uint8Array(plaintext.length + tagLength);
        out.set(tag, plaintext.length);
        out.set(processSiv(encKey, tag, plaintext));
        clean(...toClean);
        return out;
      },
      decrypt(ciphertext) {
        CIPHER_LIMIT(ciphertext.length);
        const tag = ciphertext.subarray(-tagLength);
        const { encKey, authKey } = deriveKeys();
        const toClean = [encKey, authKey];
        if (!isAligned32(ciphertext))
          toClean.push(ciphertext = copyBytes(ciphertext));
        const plaintext = processSiv(encKey, tag, ciphertext.subarray(0, -tagLength));
        const expectedTag = _computeTag(encKey, authKey, plaintext);
        toClean.push(expectedTag);
        if (!equalBytes(tag, expectedTag)) {
          clean(plaintext, ...toClean);
          throw new Error("invalid polyval tag");
        }
        clean(...toClean);
        return plaintext;
      }
    };
  });

  // src/shared/lanCrypto.ts
  function unhex(text, bytes) {
    if (typeof text !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(text) || bytes !== void 0 && text.length !== bytes * 2) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0438\u043B\u0438 \u043F\u0430\u043A\u0435\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438.");
    return Uint8Array.from(text.match(/../g), (x) => parseInt(x, 16));
  }
  var hex = (value) => Array.from(value, (n) => n.toString(16).padStart(2, "0")).join("");
  function encode(text) {
    const escaped = encodeURIComponent(text), bytes = [];
    for (let i = 0; i < escaped.length; i++) {
      if (escaped[i] === "%") {
        bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
        i += 2;
      } else bytes.push(escaped.charCodeAt(i));
    }
    return new Uint8Array(bytes);
  }
  function decode(bytes) {
    return decodeURIComponent(Array.from(bytes, (b) => "%" + b.toString(16).padStart(2, "0")).join(""));
  }
  function seal(value, key, nonce) {
    const n = unhex(nonce, 24);
    return { nonce, box: hex(gcmsiv(unhex(key, 32), n.slice(0, 12), n).encrypt(encode(JSON.stringify(value)))) };
  }
  function open(value, key) {
    if (!value || typeof value.box !== "string" || value.box.length > 2097152) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0438\u043B\u0438 \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u0430\u043A\u0435\u0442.");
    const n = unhex(value.nonce, 24);
    const bytes = gcmsiv(unhex(key, 32), n.slice(0, 12), n).decrypt(unhex(value.box));
    return JSON.parse(decode(bytes));
  }
  function parsePairing(code) {
    const match = /^rpslan1:(\d{1,3}(?:\.\d{1,3}){3}):38474:([0-9a-f]{64}):([0-9a-f]{32})$/i.exec(code.trim());
    if (!match) throw new Error("\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u043F\u043E\u043B\u043D\u044B\u0439 \u043A\u043E\u0434 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u0437 RPS \u043D\u0430 \u041F\u041A.");
    const octets = match[1].split(".").map(Number);
    if (octets.some((n) => n > 255) || !(octets[0] === 10 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 || octets[0] === 192 && octets[1] === 168)) throw new Error("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C\u0443 IPv4-\u0430\u0434\u0440\u0435\u0441\u0443 \u041F\u041A.");
    return { address: match[1], key: match[2].toLowerCase(), prefix: match[3].toLowerCase() };
  }

  // src/shared/lanSyncCore.ts
  function sanitizeProfiles(value) {
    if (!Array.isArray(value) || value.length > MAX_PROFILES) {
      throw new Error(`\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.`);
    }
    const profiles = value.map(sanitizeProfile);
    const ids = /* @__PURE__ */ new Set();
    for (const profile of profiles) {
      if (ids.has(profile.id)) throw new Error("\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0439\u0441\u044F \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043F\u0440\u043E\u0444\u0438\u043B\u044F.");
      ids.add(profile.id);
    }
    return profiles;
  }
  function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function conflictId(profile, attempt) {
    const input = JSON.stringify(profile) + ":" + attempt;
    const words = [2166136261, 2654435769, 2246822507, 3266489909];
    const hex2 = words.map((seed) => {
      let hash = seed;
      for (let i = 0; i < input.length; i++) {
        hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    }).join("");
    return `${hex2.slice(0, 8)}-${hex2.slice(8, 12)}-5${hex2.slice(13, 16)}-a${hex2.slice(17, 20)}-${hex2.slice(20)}`;
  }
  function conflictLabel(label) {
    const suffix = " \u2014 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442";
    let prefix = label.slice(0, MAX_PROFILE_LABEL_LENGTH - suffix.length);
    if (/[\uD800-\uDBFF]$/.test(prefix)) prefix = prefix.slice(0, -1);
    return prefix.trimEnd() + suffix;
  }
  function mergeProfiles(base, local, remote) {
    const snapshots = [base, local, remote].map(sanitizeProfiles);
    const [baseMap, localMap, remoteMap] = snapshots.map((profiles) => new Map(profiles.map((p) => [p.id, p])));
    const result = /* @__PURE__ */ new Map();
    const conflicts = [];
    const ids = /* @__PURE__ */ new Set([...remoteMap.keys(), ...localMap.keys(), ...baseMap.keys()]);
    for (const id of ids) {
      const before = baseMap.get(id), here = localMap.get(id), there = remoteMap.get(id);
      let chosen;
      if (equal(here, there)) chosen = here;
      else if (equal(here, before)) chosen = there;
      else if (equal(there, before)) chosen = here;
      else if (!here || !there) chosen = here ?? there;
      else {
        chosen = there;
        conflicts.push(here);
      }
      if (chosen) result.set(id, chosen);
    }
    for (const profile of conflicts) {
      for (let attempt = 0; ; attempt++) {
        const copy2 = { ...profile, id: conflictId(profile, attempt), label: conflictLabel(profile.label) };
        const occupied = snapshots.flatMap((entries) => entries.filter((p) => p.id === copy2.id));
        const current = result.get(copy2.id);
        if (occupied.some((p) => !equal(p, copy2)) || current && !equal(current, copy2)) continue;
        result.set(copy2.id, copy2);
        break;
      }
    }
    return sanitizeProfiles([...result.values()]);
  }

  // src/shared/lanSyncClient.ts
  function validateDocument(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438.");
    return { revision: value.revision, profiles: sanitizeProfiles(value.profiles) };
  }
  async function synchronizeProfiles(remote, base, local, apply, valid = () => true) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const doc = validateDocument(await remote.read());
      if (!valid()) return null;
      const before = sanitizeProfiles(local());
      const merged = mergeProfiles(base, before, doc.profiles);
      let final = doc;
      if (JSON.stringify(merged) !== JSON.stringify(doc.profiles)) {
        if (!valid()) return null;
        const result = await remote.write(doc.revision, merged);
        if (!valid()) return null;
        if (!result.ok) continue;
        final = validateDocument(result.document);
      }
      if (!valid() || !apply(final.profiles, before)) return null;
      return final.profiles;
    }
    throw new Error("\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u043D\u0430 \u0434\u0440\u0443\u0433\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435. \u041F\u043E\u0432\u0442\u043E\u0440\u044E \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u043F\u043E\u0437\u0436\u0435.");
  }

  // src/lanMobile.ts
  function createMobileSync(api, studio, fetcher = globalThis.fetch) {
    let timer, busy = false, generation = 0;
    let status = "\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E Wi-Fi \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430.";
    const listeners = /* @__PURE__ */ new Set();
    const setStatus = (text) => {
      status = text;
      listeners.forEach((f) => f());
    };
    const owner = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? "";
    const stored = () => api.plugin.storage.lanLink;
    async function request(config, value) {
      const pair = parsePairing(config.code), endpoint = `http://${pair.address}:38474`;
      const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 6e3);
      let stage = "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u041F\u041A";
      try {
        const challengeResponse = await fetcher(endpoint + "/challenge", { signal: abort.signal, redirect: "error", headers: { "Cache-Control": "no-cache" } });
        if (!challengeResponse.ok) throw new Error(`\u041F\u041A \u043E\u0442\u0432\u0435\u0442\u0438\u043B HTTP ${challengeResponse.status}. \u041F\u0440\u043E\u0432\u0435\u0440\u044C Discord \u0438 \u0441\u0435\u0442\u044C.`);
        stage = "\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043A\u043E\u0434\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F";
        const challenge = await challengeResponse.json();
        if (challenge.prefix !== pair.prefix || typeof challenge.nonce !== "string" || !/^[0-9a-f]{48}$/.test(challenge.nonce)) throw new Error("\u041A\u043E\u0434 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439 \u043D\u043E\u0432\u044B\u0439 \u043A\u043E\u0434 \u0441 \u041F\u041A.");
        stage = "\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0430";
        const body = JSON.stringify(seal({ ...value, ownerId: config.owner }, pair.key, challenge.nonce));
        stage = "\u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439 \u043D\u0430 \u041F\u041A";
        const response = await fetcher(endpoint + "/sync", { method: "POST", signal: abort.signal, redirect: "error", headers: { "Content-Type": "application/json" }, body });
        if (!response.ok) throw new Error(`\u041F\u041A \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 (HTTP ${response.status}). \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043A\u043E\u0434 \u0438 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 Discord.`);
        stage = "\u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 \u041F\u041A";
        const raw = await response.text();
        if (raw.length > 2097152) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 \u041F\u041A.");
        const result = open(JSON.parse(raw), pair.key);
        if (result.requestNonce !== challenge.nonce) throw new Error("\u041E\u0442\u0432\u0435\u0442 \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0441\u044F \u043A \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443.");
        return result;
      } catch (e) {
        throw new Error(`${stage}: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        clearTimeout(timeout);
      }
    }
    async function tick() {
      const config = stored();
      if (busy || !config?.enabled) return;
      if (!owner() || owner() !== config.owner) {
        generation++;
        api.plugin.storage.lanLink = { ...config, enabled: false };
        setStatus("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044E \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
        return;
      }
      busy = true;
      const operation = generation;
      const valid = () => operation === generation && stored()?.enabled === true && stored()?.code === config.code && owner() === config.owner;
      try {
        const base = await synchronizeProfiles({ read: async () => (await request(config, { op: "read" })).document, write: (expectedRevision, profiles) => request(config, { op: "write", expectedRevision, profiles }) }, config.base || [], () => studio.getSnapshot().profiles, (next, before) => studio.replaceSyncedProfiles(next, before), valid);
        if (base && valid()) {
          api.plugin.storage.lanLink = { ...config, base };
          setStatus("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043E: " + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ". \u0410\u043A\u0442\u0438\u0432\u043D\u0430\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u0430\u0441\u044C.");
        }
      } catch (e) {
        if (valid()) setStatus("\u041D\u0435\u0442 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438. " + (e instanceof Error ? e.message : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C Wi-Fi \u0438 Discord \u043D\u0430 \u041F\u041A.") + " \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B; \u043F\u043E\u0432\u0442\u043E\u0440 \u0447\u0435\u0440\u0435\u0437 10 \u0441\u0435\u043A\u0443\u043D\u0434.");
      } finally {
        busy = false;
      }
    }
    return {
      status: () => status,
      enabled: () => stored()?.enabled === true,
      subscribe(f) {
        listeners.add(f);
        return () => {
          listeners.delete(f);
        };
      },
      async connect(code) {
        parsePairing(code);
        const id = owner();
        if (!id) throw new Error("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043E\u0439\u0434\u0438 \u0432 Discord.");
        const previous = stored();
        generation++;
        api.plugin.storage.lanLink = { enabled: true, code: code.trim(), owner: id, base: previous?.code === code.trim() && previous.owner === id ? previous.base : [] };
        this.start();
        await tick();
      },
      disconnect() {
        generation++;
        const config = stored();
        if (config) api.plugin.storage.lanLink = { ...config, enabled: false };
        setStatus("\u0421\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u044F \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430. \u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.");
      },
      start() {
        if (timer) return;
        timer = setInterval(() => {
          void tick();
        }, 1e4);
        void tick();
      },
      stop() {
        generation++;
        if (timer) clearInterval(timer);
        timer = void 0;
      },
      syncNow: tick
    };
  }

  // src/profileShortcut.ts
  var KEY = "rps-profile-shortcut";
  var groups = [/* @__PURE__ */ new Set(["quests", "\u0437\u0430\u0434\u0430\u043D\u0438\u044F"]), /* @__PURE__ */ new Set(["shop", "\u043C\u0430\u0433\u0430\u0437\u0438\u043D"]), /* @__PURE__ */ new Set(["settings", "\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"])];
  function describe(root) {
    const labels = /* @__PURE__ */ new Set();
    let clickable = false, remaining = 40;
    function visit(value, depth) {
      if (--remaining < 0 || depth > 5 || value == null) return;
      if (typeof value === "string") {
        labels.add(value.trim().toLowerCase());
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => visit(v, depth + 1));
        return;
      }
      const type = value.type ?? value;
      const typeName = type?.displayName || type?.name || type?.render?.name;
      if (typeName === "QuestsIcon") labels.add("quests");
      if (typeName === "ShopIcon" || typeName === "CollectiblesShopEntryButton") labels.add("shop");
      if (typeName === "SettingsIcon") labels.add("settings");
      const p = value.props;
      if (!p) return;
      clickable || (clickable = typeof p.onPress === "function");
      for (const name of ["label", "text", "title", "accessibilityLabel", "icon", "Icon", "children"]) visit(p[name], depth + 1);
    }
    visit(root, 0);
    return { labels, clickable };
  }
  function isProfileActionRow(element) {
    const children = element?.props?.children;
    if (!Array.isArray(children) || children.some((c) => c?.key === KEY)) return false;
    const visible = children.flat(2).filter((c) => c != null && c !== false);
    if (visible.length !== 3) return false;
    const descriptions = visible.map(describe);
    return descriptions.filter((d) => d.clickable).length >= 2 && groups.every((group) => descriptions.some((d) => [...d.labels].some((label) => group.has(label))));
  }
  function createProfileShortcut(api, renderSettings2) {
    const { React: React3, ReactNative: RN3 } = api.metro.common;
    let active = false, editing = false;
    const unpatch = [];
    const closeEditors = /* @__PURE__ */ new Set();
    function Shortcut() {
      const [open2, setOpen] = React3.useState(false);
      const close = () => setOpen(false);
      React3.useEffect(() => {
        closeEditors.add(close);
        return () => {
          closeEditors.delete(close);
        };
      }, []);
      const button = React3.createElement(
        RN3.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: "Rich Presence Studio \u2014 \u043D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441",
          onPress: () => {
            if (active) setOpen(true);
          },
          hitSlop: { top: 6, bottom: 6, left: 4, right: 4 },
          style: { minWidth: 56, height: 44, flex: 1, alignSelf: "flex-start", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 6 }
        },
        React3.createElement(RN3.Text, { style: { color: "#aeb8ff", fontSize: 24, lineHeight: 24, height: 24, includeFontPadding: false, textAlign: "center" } }, "\u2726"),
        React3.createElement(RN3.Text, { style: { color: "#eeeeee", fontSize: 12, lineHeight: 16, fontWeight: "600", includeFontPadding: false, marginTop: 4 } }, "RPS")
      );
      return React3.createElement(React3.Fragment, null, button, open2 && React3.createElement(RN3.Modal, {
        visible: true,
        animationType: "slide",
        presentationStyle: "fullScreen",
        onRequestClose: close
      }, React3.createElement(
        RN3.SafeAreaView,
        { style: {
          flex: 1,
          backgroundColor: "#17181d",
          // Core SafeAreaView only applies native safe-area padding on iOS.
          // Android 15 edge-to-edge also places modal content under the status bar.
          paddingTop: RN3.Platform?.OS === "android" ? RN3.StatusBar?.currentHeight ?? 0 : 0
        } },
        React3.createElement(
          RN3.View,
          { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, minHeight: 56 } },
          React3.createElement(RN3.Text, { style: { color: "#f3f4fa", fontSize: 18, fontWeight: "700", flex: 1 } }, "Rich Presence Studio"),
          React3.createElement(
            RN3.Pressable,
            { accessibilityRole: "button", accessibilityLabel: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 RPS", onPress: close, style: { padding: 12 } },
            React3.createElement(RN3.Text, { style: { color: "#aeb8ff", fontSize: 16 } }, "\u0417\u0430\u043A\u0440\u044B\u0442\u044C")
          )
        ),
        React3.createElement(renderSettings2)
      )));
    }
    function inject(_args, element) {
      if (!active || editing) return;
      try {
        observeComponent(element);
        if (!isProfileActionRow(element)) return;
        recordMatch();
        editing = true;
        return React3.cloneElement(element, {}, ...element.props.children, React3.createElement(Shortcut, { key: KEY }));
      } catch (e) {
        api.logger?.error?.("RPS profile shortcut", e);
      } finally {
        editing = false;
      }
    }
    return {
      start() {
        if (active || !api.patcher?.after) return;
        active = true;
        try {
          const jsx = api.metro.findByProps("jsx", "jsxs");
          for (const method of ["jsx", "jsxs"]) if (typeof jsx?.[method] === "function") unpatch.push(api.patcher.after(method, jsx, inject));
          if (typeof React3.createElement === "function") unpatch.push(api.patcher.after("createElement", React3, inject));
          setHookCount(unpatch.length);
        } catch (e) {
          this.stop();
          api.logger?.error?.("RPS profile shortcut unavailable", e);
        }
      },
      stop() {
        active = false;
        for (const close of closeEditors) close();
        closeEditors.clear();
        for (const undo of unpatch.splice(0).reverse()) undo();
        setHookCount(0);
      }
    };
  }

  // src/index.ts
  var runtime = createRuntime(vendetta);
  var sync = createMobileSync(vendetta, runtime.controller);
  var renderSettings = () => vendetta.metro.common.React.createElement(Settings_default, { controller: runtime.controller, sync });
  var shortcut = createProfileShortcut(vendetta, renderSettings);
  var index_default = {
    onLoad: () => {
      runtime.start();
      sync.start();
      shortcut.start();
    },
    onUnload: () => {
      shortcut.stop();
      sync.stop();
      runtime.stop();
    },
    settings: renderSettings
  };
  return __toCommonJS(index_exports);
})();

return RPS.default;})()