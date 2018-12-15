import { observable, computed } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full-render.js';

let viz: any = new Viz({ Module, render });

// The API differentiates between `breakpoints`, which only contain meta
// information, and `snapshots`, which contain a dump of the whole compiler
// state in addition to meta data.
const API = {
    breakpoint_continue: "/breakpoint/continue",
    snapshot_latest: "/snapshot/latest",
    breakpoint_listing: "/breakpoint/all",
    snapshot: index => `/snapshot/${index}`,
}

const MAIN_FUNCTION = "mj_main";

export interface Breakpoint {
    label: string;
    file: string;
    line: number;
    column: number;
}

export interface GraphMap {
    [key: string]: Graph;
}

export interface Graph {
    class_name: string;
    method_name: string;
    dot_file: string;
}

export interface CompilationState {
    breakpoint: Breakpoint;
    dot_files: GraphMap;
}

export class Model {
    constructor() {
        setInterval(() => {
            this.loadSnapshot();
            this.loadBreakpointHistory();
        }, 200);
    }

    continue_execution() {
        fetch(API.breakpoint_continue);
    }

    async set_active_method(new_active: string): Promise<void> {
        if (this.compilation_state && !this.compilation_state.dot_files[new_active]) {
            console.error("trying to view unknown graph", new_active);
            return;
        }

        console.info("active method is now", new_active);
        this.active_method = new_active;

        if (this.compilation_state) {
            this.svg = await viz.renderString(this.compilation_state.dot_files[this.active_method].dot_file);
        }
    }

    async set_active_snapshot(index: number | null): Promise<void> {
        console.info("active snapshot is now", index);
        this.active_snapshot = index;
        this.loadSnapshot();
    }

    async loadSnapshot(): Promise<void> {
        const data = await fetch(this.active_snapshot == null ? API.snapshot_latest : API.snapshot(this.active_snapshot));

        if (!data.ok) { return; }

        const text = await data.text();

        if (text == this.compilation_state_unparsed) {
            return;
        }

        const compilation_state: CompilationState = JSON.parse(text);

        this.compilation_state_unparsed = text;
        this.compilation_state = compilation_state;

        if (this.active_method == null || !this.compilation_state.dot_files[this.active_method]) {
            this.active_method = MAIN_FUNCTION;
        }

        this.svg = await viz.renderString(this.compilation_state.dot_files[this.active_method].dot_file);
    }

    async loadBreakpointHistory(): Promise<void> {
        const data = await fetch(API.breakpoint_listing);
        if (!data.ok) { return; }
        this.history = JSON.parse(await data.text());
    }

    @observable compilation_state_unparsed: string | null;
    @observable compilation_state: CompilationState | null;
    @observable history: Breakpoint[] | null;

    @observable active_method: string | null;
    @observable active_snapshot: number | null;
    @observable svg: string | null;
}
