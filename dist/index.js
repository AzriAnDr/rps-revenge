(()=>{var RPS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // src/Settings.tsx
  var { React, ReactNative: RN } = vendetta.metro.common;
  var { ScrollView, Text, TextInput, Pressable, Switch, View, Alert } = RN;
  var colors = { background: "#17181d", panel: "#252730", text: "#f3f4fa", muted: "#b6bbce", accent: "#6476ee", error: "#ffacb5" };
  var styles = {
    heading: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 20, marginBottom: 10 },
    text: { color: colors.text, fontSize: 15 },
    hint: { color: colors.muted, fontSize: 13, marginBottom: 10 },
    row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    input: { color: colors.text, backgroundColor: colors.panel, borderColor: "#535869", borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginTop: 6, marginBottom: 12 }
  };
  function Button({ title, onPress, selected = false, disabled = false, danger = false }) {
    return /* @__PURE__ */ React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: title,
        accessibilityState: { disabled, selected },
        disabled,
        onPress,
        style: { minHeight: 46, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: selected ? colors.accent : colors.panel, opacity: disabled ? 0.45 : 1 }
      },
      /* @__PURE__ */ React.createElement(Text, { style: { color: danger ? colors.error : colors.text, fontSize: 15 } }, title)
    );
  }
  function Field({ label, value, onChange, placeholder = "", maxLength = 128, url = false, multiline = false }) {
    return /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: styles.text }, label), /* @__PURE__ */ React.createElement(
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
  function Settings({ controller }) {
    const [snapshot, setSnapshot] = React.useState(() => controller.getSnapshot());
    const [draft, setDraft] = React.useState(() => copy(controller.getSnapshot().profiles[0] ?? createProfile()));
    const [baseline, setBaseline] = React.useState(() => JSON.stringify(draft));
    const [error, setError] = React.useState("");
    const [notice, setNotice] = React.useState("");
    const [json, setJson] = React.useState("");
    const dirty = JSON.stringify(draft) !== baseline;
    React.useEffect(() => {
      const refresh = () => setSnapshot(controller.getSnapshot());
      const unsubscribe = controller.subscribe(refresh);
      refresh();
      return unsubscribe;
    }, [controller]);
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
    const field = (key, label, maxLength = 128, url = false, placeholder = "") => /* @__PURE__ */ React.createElement(Field, { label, value: draft[key], onChange: (value) => patch(key, value), maxLength, url, placeholder });
    return /* @__PURE__ */ React.createElement(ScrollView, { style: { backgroundColor: colors.background }, contentContainerStyle: { padding: 18, paddingBottom: 60 }, keyboardShouldPersistTaps: "handled" }, /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "Rich Presence Studio"), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043D\u0430 \u044D\u0442\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043C\u0435\u0436\u0434\u0443 \u041F\u041A \u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C \u2014 \u0447\u0435\u0440\u0435\u0437 JSON."), /* @__PURE__ */ React.createElement(Text, { accessibilityLiveRegion: "polite", style: { color: snapshot.phase === "error" ? colors.error : colors.text, marginBottom: 12 } }, snapshot.message), !!error && /* @__PURE__ */ React.createElement(Text, { accessibilityRole: "alert", accessibilityLiveRegion: "assertive", selectable: true, style: { color: colors.error, marginBottom: 12 } }, error), !!notice && /* @__PURE__ */ React.createElement(Text, { accessibilityLiveRegion: "polite", style: styles.hint }, notice), !snapshot.sharingEnabled && /* @__PURE__ */ React.createElement(Text, { style: { color: colors.error, marginBottom: 12 } }, "\u041F\u043E\u043A\u0430\u0437 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438 \u0432 Discord \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u0438\u043B\u0438 \u0435\u0433\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438."), snapshot.conflict && /* @__PURE__ */ React.createElement(Text, { style: { color: colors.error, marginBottom: 12 } }, "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0430 \u0434\u0440\u0443\u0433\u0430\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0430\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C. \u041E\u0442\u043A\u043B\u044E\u0447\u0438 \u0435\u0451, \u0435\u0441\u043B\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u0443\u044E\u0442."), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438"), /* @__PURE__ */ React.createElement(View, { style: styles.row }, snapshot.profiles.map((profile) => /* @__PURE__ */ React.createElement(
      Button,
      {
        key: profile.id,
        title: `${profile.label}${snapshot.activeProfile?.id === profile.id ? " \xB7 \u0430\u043A\u0442\u0438\u0432\u0435\u043D" : ""}`,
        selected: profile.id === draft.id,
        onPress: () => {
          if (profile.id !== draft.id) replaceDraft(() => select(profile));
        }
      }
    ))), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Button, { title: "\u041D\u043E\u0432\u044B\u0439", onPress: () => replaceDraft(() => select(createProfile())) }), /* @__PURE__ */ React.createElement(Button, { title: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C", onPress: () => void run(() => {
      const next = cloneProfile(draft);
      controller.saveProfile(next);
      select(next);
    }) }), /* @__PURE__ */ React.createElement(Button, { title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", danger: true, disabled: !snapshot.profiles.some((profile) => profile.id === draft.id), onPress: () => Alert.alert("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C?", `\xAB${draft.label}\xBB \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D. \u0415\u0441\u043B\u0438 \u043E\u043D \u0430\u043A\u0442\u0438\u0432\u0435\u043D, \u043F\u043E\u043A\u0430\u0437 \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F.`, [
      { text: "\u041E\u0442\u043C\u0435\u043D\u0430", style: "cancel" },
      { text: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", style: "destructive", onPress: () => void run(() => {
        controller.removeProfile(draft.id);
        select(controller.getSnapshot().profiles[0] ?? createProfile());
      }) }
    ]) })), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440", dirty ? " \xB7 \u0435\u0441\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" : ""), field("label", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", 60), field("name", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"), field("details", "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0441\u0442\u0438"), field("state", "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435"), field("applicationId", "Application ID", 21, true, "\u041F\u0443\u0441\u0442\u043E\u0435 \u043F\u043E\u043B\u0435 \u2014 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u043E\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435"), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 ID \u0443\u0436\u0435 \u0437\u0430\u0434\u0430\u043D \u0432 \u043D\u043E\u0432\u043E\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435. \u0414\u043B\u044F \u0441\u0432\u043E\u0438\u0445 Art Assets \u0443\u043A\u0430\u0436\u0438 ID \u0441\u0432\u043E\u0435\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F."), /* @__PURE__ */ React.createElement(Text, { style: styles.text }, "\u0422\u0438\u043F \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438"), /* @__PURE__ */ React.createElement(View, { style: [styles.row, { marginTop: 8 }] }, [[0, "\u0418\u0433\u0440\u0430\u0435\u0442"], [2, "\u0421\u043B\u0443\u0448\u0430\u0435\u0442"], [3, "\u0421\u043C\u043E\u0442\u0440\u0438\u0442"], [5, "\u0421\u043E\u0440\u0435\u0432\u043D\u0443\u0435\u0442\u0441\u044F"]].map(([value, label]) => /* @__PURE__ */ React.createElement(Button, { key: value, title: label, selected: draft.type === value, onPress: () => patch("type", value) }))), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u0412\u0441\u0442\u0430\u0432\u044C \u043F\u0440\u044F\u043C\u0443\u044E http(s)-\u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 Art Asset. \u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0441\u0430\u0439\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442."), field("largeImage", "\u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: URL / \u043A\u043B\u044E\u0447", 512, true), field("largeText", "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), field("smallImage", "\u041C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: URL / \u043A\u043B\u044E\u0447", 512, true), field("smallText", "\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u041A\u043D\u043E\u043F\u043A\u0438 \xB7 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 2"), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u041E\u0431\u044B\u0447\u043D\u044B\u0435 emoji \u043C\u043E\u0436\u043D\u043E \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C \u043F\u0440\u044F\u043C\u043E \u0432 \u0442\u0435\u043A\u0441\u0442 \u043A\u043D\u043E\u043F\u043A\u0438. \u0417\u0430\u043F\u043E\u043B\u043D\u0438 \u0438 \u0442\u0435\u043A\u0441\u0442, \u0438 URL. \u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 Discord \u043C\u043E\u0436\u0435\u0442 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0442\u0435\u0431\u0435."), draft.buttons.map((button, index) => /* @__PURE__ */ React.createElement(View, { key: index, style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: `\u041A\u043D\u043E\u043F\u043A\u0430 ${index + 1}: emoji \u0438 \u0442\u0435\u043A\u0441\u0442`, value: button.label, maxLength: 31, onChange: (value) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, label: value } : item)) }), /* @__PURE__ */ React.createElement(Field, { label: `\u041A\u043D\u043E\u043F\u043A\u0430 ${index + 1}: URL`, value: button.url, maxLength: 512, url: true, onChange: (value) => patch("buttons", draft.buttons.map((item, i) => i === index ? { ...item, url: value } : item)) }), /* @__PURE__ */ React.createElement(Button, { title: `\u0423\u0431\u0440\u0430\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443 ${index + 1}`, danger: true, onPress: () => patch("buttons", draft.buttons.filter((_, i) => i !== index)) }))), /* @__PURE__ */ React.createElement(Button, { title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443", disabled: draft.buttons.length >= 2, onPress: () => patch("buttons", [...draft.buttons, { label: "", url: "" }]) }), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u0422\u0430\u0439\u043C\u0435\u0440"), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Button, { title: "\u0411\u0435\u0437 \u0442\u0430\u0439\u043C\u0435\u0440\u0430", selected: draft.timer === "none", onPress: () => patch("timer", "none") }), /* @__PURE__ */ React.createElement(Button, { title: "\u0421 \u043C\u043E\u043C\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F", selected: draft.timer === "elapsed", onPress: () => patch("timer", "elapsed") })), draft.type === 5 && /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u0414\u043B\u044F \u0442\u0438\u043F\u0430 \xAB\u0421\u043E\u0440\u0435\u0432\u043D\u0443\u0435\u0442\u0441\u044F\xBB \u0442\u0430\u0439\u043C\u0435\u0440 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u0442\u0441\u044F."), /* @__PURE__ */ React.createElement(View, { style: [styles.row, { marginTop: 18 }] }, /* @__PURE__ */ React.createElement(Button, { title: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C", onPress: () => void run(save) }), /* @__PURE__ */ React.createElement(Button, { title: snapshot.phase === "applying" ? "\u041F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F\u2026" : "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C", selected: true, disabled: snapshot.phase === "applying", onPress: () => void run(async () => {
      const applied = copy(draft);
      await controller.applyProfile(applied);
      setBaseline(JSON.stringify(applied));
    }) }), /* @__PURE__ */ React.createElement(Button, { title: "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C", danger: true, onPress: () => void run(() => controller.disable()) })), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440. \xAB\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C\xBB \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0432 Discord."), /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row", alignItems: "center", marginVertical: 12 } }, /* @__PURE__ */ React.createElement(Text, { style: [styles.text, { flex: 1 }] }, "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435"), /* @__PURE__ */ React.createElement(Switch, { accessibilityLabel: "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u0430\u0432\u043B\u0438\u0432\u0430\u0442\u044C \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435", value: snapshot.restoreOnStart, onValueChange: (value) => void run(() => controller.setRestoreOnStart(value)) })), /* @__PURE__ */ React.createElement(Text, { style: styles.heading }, "\u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439"), /* @__PURE__ */ React.createElement(Text, { style: styles.hint }, "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u0438. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F. \u0418\u043C\u043F\u043E\u0440\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0435\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u0438, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044F \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435."), /* @__PURE__ */ React.createElement(Field, { label: "JSON \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439", value: json, onChange: setJson, multiline: true, url: true, maxLength: 1048577, placeholder: "\u0412\u0441\u0442\u0430\u0432\u044C JSON \u0441 \u041F\u041A \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u0433\u043E \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u0430" }), /* @__PURE__ */ React.createElement(View, { style: styles.row }, /* @__PURE__ */ React.createElement(Button, { title: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON", onPress: () => void run(() => {
      controller.importProfiles(json);
      setNotice("\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B. \u0412\u044B\u0431\u0435\u0440\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u0432\u044B\u0448\u0435.");
    }) }), /* @__PURE__ */ React.createElement(Button, { title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442", onPress: () => void run(() => setJson(controller.exportProfiles())) }), /* @__PURE__ */ React.createElement(Button, { title: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442", onPress: () => void run(async () => {
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
      const clean = sanitizeProfile(profile);
      const exists = data.profiles.some((item) => item.id === clean.id);
      if (!exists && data.profiles.length >= MAX_PROFILES)
        throw new Error(`\u041C\u043E\u0436\u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${MAX_PROFILES} \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u0439.`);
      const profiles = exists ? data.profiles.map((item) => item.id === clean.id ? clean : item) : [...data.profiles, clean];
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
      let clean;
      try {
        clean = sanitizeProfile(profile);
      } catch (error) {
        fail(errorText(error));
      }
      const issues = validateProfile(clean, { forApply: true });
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
        if (saveDraft) saveProfile(clean);
        update({ phase: "applying", message: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443\u2026", ...environment() });
        const applicationId = resolveApplicationId(clean.applicationId);
        const [large, small] = await Promise.all([
          clean.largeImage.trim() ? deps.resolveAsset(applicationId, clean.largeImage.trim()) : void 0,
          clean.smallImage.trim() ? deps.resolveAsset(applicationId, clean.smallImage.trim()) : void 0
        ]);
        if (request !== generation || !running) return;
        if (deps.getUserId() !== userId) {
          clearPresence("\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041F\u0440\u0438\u043C\u0435\u043D\u0438 \u043D\u0443\u0436\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", false);
          ownerId = deps.getUserId();
          return;
        }
        if (clean.largeImage.trim() && !large)
          throw new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0431\u043E\u043B\u044C\u0448\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0440\u044F\u043C\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.");
        if (clean.smallImage.trim() && !small)
          throw new Error("Discord \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0443\u044E \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0440\u044F\u043C\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043A\u043B\u044E\u0447 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.");
        const activity = {
          application_id: applicationId,
          name: clean.name.trim(),
          type: clean.type,
          flags: 1
        };
        if (clean.details.trim()) activity.details = clean.details.trim();
        if (clean.state.trim()) activity.state = clean.state.trim();
        if (clean.timer === "elapsed" && clean.type !== 5)
          activity.timestamps = { start: now() };
        if (large || small) {
          activity.assets = {};
          if (large) {
            activity.assets.large_image = large;
            if (clean.largeText.trim()) activity.assets.large_text = clean.largeText.trim();
          }
          if (small) {
            activity.assets.small_image = small;
            if (clean.smallText.trim()) activity.assets.small_text = clean.smallText.trim();
          }
        }
        const buttons = clean.buttons.filter((button) => button.label.trim() && button.url.trim());
        if (buttons.length) {
          activity.buttons = buttons.map((button) => button.label.trim());
          activity.metadata = { button_urls: buttons.map((button) => button.url.trim()) };
        }
        deps.publish(activity);
        lastPublishedAt = now();
        update({ activeProfile: copyProfile(clean), phase: "active", message: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 Discord.", ...environment() });
        persist({ ...data, lastApplied: clean, lastOwnerId: userId, resumeEnabled: true });
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
    let pendingLogout = false;
    let pendingReconnect = false;
    const subscriptions = [];
    const user = () => api.metro.findByProps("getCurrentUser")?.getCurrentUser?.()?.id ?? null;
    function publish(activity) {
      const actions = api.metro.findByProps("SET_ACTIVITY");
      if (!actions || !dispatcher?.dispatch) {
        if (!activity && !lastActivity) return;
        throw new Error("\u042D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F Discord \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 API \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438. \u041E\u0431\u043D\u043E\u0432\u0438 Revenge/Discord \u0434\u043E \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438.");
      }
      dispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity, socketId: SOCKET_ID, pid: PID });
      lastActivity = activity;
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
        if (timer !== void 0) clearTimeout(timer);
        for (const [event, handler] of subscriptions.splice(0)) dispatcher.unsubscribe(event, handler);
        try {
          controller.stop();
        } catch (e) {
          api.logger?.error?.(e);
        }
      }
    };
  }

  // src/index.ts
  var runtime = createRuntime(vendetta);
  var index_default = {
    onLoad: () => runtime.start(),
    onUnload: () => runtime.stop(),
    settings: () => vendetta.metro.common.React.createElement(Settings_default, { controller: runtime.controller })
  };
  return __toCommonJS(index_exports);
})();

return RPS.default;})()