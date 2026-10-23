import Settings from "./Settings";
import { createRuntime } from "./runtime";
import { createMobileSync } from "./lanMobile";
declare const vendetta: any;
const runtime = createRuntime(vendetta);
const sync = createMobileSync(vendetta, runtime.controller);
export default {
    onLoad: () => { runtime.start(); sync.start(); },
    onUnload: () => { sync.stop(); runtime.stop(); },
    settings: () => vendetta.metro.common.React.createElement(Settings, { controller: runtime.controller, sync })
};
