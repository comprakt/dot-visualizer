import { observable, computed } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full-render.js';

let viz: any = new Viz({ Module, render });

const API = {
    breakpoint_continue: "/breakpoint/continue",
    breakpoint_get_most_recent: "/breakpoint",
}

const MAIN_FUNCTION = "mj_main";

interface Breakpoint {
    label: string;
    file: string;
    line: number;
    column: number;
}

interface GraphMap {
    [key: string]: Graph;
}

interface Graph {
    class_name: string;
    method_name: string;
    dot_file: string;
}

interface CompilationState {
    breakpoint: Breakpoint;
    dot_files: GraphMap;
}

export class Model {
    constructor() {
        setInterval(() => {
            this.loadData();
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

    async loadData(): Promise<void> {
        const data = await fetch(API.breakpoint_get_most_recent);

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

    @observable compilation_state_unparsed: string | null;
    @observable compilation_state: CompilationState | null;

    @observable active_method: string | null;
    @observable svg: string | null;
    @observable history: string | null;
}
