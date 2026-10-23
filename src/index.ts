import Settings from "./Settings";
import { createRuntime } from "./runtime";
import { createMobileSync } from "./lanMobile";
import { createProfileShortcut } from "./profileShortcut";
declare const vendetta: any;
const runtime = createRuntime(vendetta);
const sync = createMobileSync(vendetta, runtime.controller);
const renderSettings = () => vendetta.metro.common.React.createElement(Settings, { controller: runtime.controller, sync });
const shortcut = createProfileShortcut(vendetta, renderSettings);
export default {
    onLoad: () => { runtime.start(); sync.start(); shortcut.start(); },
    onUnload: () => { shortcut.stop(); sync.stop(); runtime.stop(); },
    settings: renderSettings
};
