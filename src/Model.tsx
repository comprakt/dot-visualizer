import { observable, computed } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

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
        this.compiler_online = null;
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

    async previous_snapshot(): Promise<void> {
        if (this.history != null) {
            let idx: number = (this.active_snapshot != null) ? this.active_snapshot - 1 : this.history.length - 2;
            this.active_snapshot = Math.max(0, idx);
            this.loadSnapshot();
        }
    }

    async next_snapshot(): Promise<void> {
        if (this.history != null) {
            let idx: number = (this.active_snapshot != null) ? this.active_snapshot + 1 : this.history.length - 1;
            this.active_snapshot = Math.min(this.history.length - 1, idx);
            this.loadSnapshot();
        }
    }

    async loadSnapshot(): Promise<void> {
        const endpoint = this.active_snapshot == null ? API.snapshot_latest : API.snapshot(this.active_snapshot);
        const text = await this.fetch_api(endpoint);

        if (text == this.compilation_state_unparsed || text == null) {
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

    compiler_connectivity_error() {
        this.compiler_online = false;
    }

    compiler_connectivity(data) {
        if (!data.ok) {
            this.compiler_connectivity_error();
            return false;
        }
        this.compiler_online = true;
        return true;
    }

    async fetch_api(endpoint): Promise<string | null> {
        try {
            const data = await fetch(endpoint);
            if (!this.compiler_connectivity(data)) { return null; }
            return await data.text();
        } catch (e) {
            this.compiler_connectivity_error();
        }

        return null;
    }

    async loadBreakpointHistory(): Promise<void> {
        let response = await this.fetch_api(API.breakpoint_listing);

        if (response == null) {
            return;
        }

        this.history = JSON.parse(response);
    }

    @observable compilation_state_unparsed: string | null;
    @observable compilation_state: CompilationState | null;
    @observable history: Breakpoint[] | null;

    @observable active_method: string | null;
    @observable active_snapshot: number | null;
    @observable compiler_online: boolean | null;
    @observable svg: string | null;
}
