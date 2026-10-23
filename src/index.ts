import Settings from "./Settings";
import { createRuntime } from "./runtime";
declare const vendetta: any;
const runtime = createRuntime(vendetta);
export default {
    onLoad: () => runtime.start(),
    onUnload: () => runtime.stop(),
    settings: () => vendetta.metro.common.React.createElement(Settings, { controller: runtime.controller })
};
