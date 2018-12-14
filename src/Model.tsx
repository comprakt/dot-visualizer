import { observable, computed } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

let viz = new Viz({ Module, render });

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

        this.svg = await viz.renderString(compilation_state.dot_files[MAIN_FUNCTION].dot_file);
    }

    compilation_state_unparsed: string | null;
    compilation_state: CompilationState | null;

    @observable svg: string | null;
}
