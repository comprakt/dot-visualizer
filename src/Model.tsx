import { observable, computed, action, autorun, intercept, runInAction } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

let viz: any = new Viz({ Module, render });

// The API differentiates between `breakpoints`, which only contain meta
// information, and `snapshots`, which contain a dump of the whole compiler
// state in addition to meta data.
const API = {
    breakpointContinue: "/breakpoint/continue",
    snapshotLatest: "/snapshot/latest",
    breakpointListing: "/breakpoint/all",
    snapshot: (index: number) => `/snapshot/${index}`,
};

const SERVER = "http://localhost:8000";

const MAIN_FUNCTION = "mj_main";

export interface Breakpoint {
    label: string;
    file: string;
    line: number;
    column: number;
}

export interface CompilationState {
    breakpoint: Breakpoint;
    graphs: GraphMap;
}

export interface GraphMap {
    [key: string]: Graph;
}

export interface Graph {
    name: string;
    dot_content: string;
}

export enum ConnectionState {
    Connecting,
    Connected,
    Disconnected
}

interface BreakpointWithCache {
    breakpoint: Breakpoint;
    cachedState: CompilationState|null;
}

export class Model {
    compilationStateUnparsed: string | null;

    @observable private breakpoints: BreakpointWithCache[] = [];
    @computed get history(): Breakpoint[] {
        return this.breakpoints.map(b => b.breakpoint);
    }

    @observable preferredActiveBreakpoint: number | "latest" = "latest";
    @computed get activeBreakpointIdx(): number|null {
        const activeBreakpointIdx =
            this.preferredActiveBreakpoint === "latest"
            ? this.breakpoints.length - 1
            : this.preferredActiveBreakpoint;
        if (!(0 <= activeBreakpointIdx && activeBreakpointIdx < this.history.length)) {
            return null;
        }
        return activeBreakpointIdx;
    }

    @observable preferredActiveMethod: string | null;
    @observable activeCompilationState: CompilationState | null;
    @observable activeMethod: string | null;
    @observable activeSvg: string | null;
    
    @observable compilerConnectionState: ConnectionState;
    
    constructor() {
        this.compilerConnectionState = ConnectionState.Connecting;
        setInterval(() => {
            this.updateBreakpointHistory();
        }, 100);
        
        let lastCompileConnectionState = ConnectionState.Connecting;
        autorun(async () => {
            if (this.compilerConnectionState == lastCompileConnectionState) { return; }
            lastCompileConnectionState = this.compilerConnectionState;

            if (this.compilerConnectionState == ConnectionState.Connected) {
                runInAction("Clear old breakpoints", () => {
                    this.breakpoints = [];
                });
            }
        });

        autorun(async () => {
            const idx = this.activeBreakpointIdx;
            if (idx !== null) {
                // update cached state
                const bp = this.breakpoints[idx];
                if (!bp.cachedState) {
                    const text = await this.fetchApi(API.snapshot(idx));
                    if (!text) { return; }
                    const compilationState = JSON.parse(text) as CompilationState;
                    bp.cachedState = compilationState;
                }		
            }
        });

        let iteration = 0;

        autorun(async () => {
            try {
                iteration += 1;
                const localIteration = iteration;
                const idx = this.activeBreakpointIdx;
                if (idx === null) { throw new Error("No Index"); }

                const bp = this.breakpoints[idx];
                if (!bp.cachedState) { throw new Error("Not cached"); }

                runInAction("Set compilation state", () => {
                    this.activeCompilationState = bp.cachedState;
                });
                
                const graphs = bp.cachedState.graphs;
                let activeMethod: string|null = null;
                if (this.preferredActiveMethod && graphs[this.preferredActiveMethod]) {
                    activeMethod = this.preferredActiveMethod;
                } else if (graphs[MAIN_FUNCTION]) {
                    activeMethod = MAIN_FUNCTION;
                }
                else {	
                    const keys = Object.keys(graphs);
                    if (keys.length > 0) {
                        activeMethod = keys[0];
                    }
                }

                runInAction("Set active method", () => this.activeMethod = activeMethod);
                if (!activeMethod) { throw new Error("No active method"); }

                const dotContent = bp.cachedState.graphs[activeMethod].dot_content;
                const activeSvg = await viz.renderString(dotContent);

                if (localIteration === iteration) {
                    // only if no other change happened during the rendering
                    runInAction("Update active svg", () => this.activeSvg = activeSvg);
                }

            } catch (e) {
                console.error(e);
            }
        });
    }
    

    async updateBreakpointHistory(): Promise<void> {
        let response = await this.fetchApi(API.breakpointListing);
        if (response == null) { return; }
        const newHistory = JSON.parse(response) as Breakpoint[];
        if (newHistory.length != this.history.length) {
            runInAction("update history", () => {
                this.breakpoints.push(...newHistory.slice(this.breakpoints.length).map(b => ({ breakpoint: b, cachedState: null })));
            });
        }
    }

    continueExecution() {
        this.preferredActiveBreakpoint = "latest";
        this.fetchApi(API.breakpointContinue);
    }

    setPreferredActiveMethod(newActive: string) {
        this.preferredActiveMethod = newActive;
    }

    setActiveSnapshot(idx: number | "latest") {
        this.preferredActiveBreakpoint = idx;
    }

    selectPreviousSnapshot() {
        const idx = this.activeBreakpointIdx;
        if (idx && idx > 0) {
            runInAction("Select previous snapshot", () => this.preferredActiveBreakpoint = idx - 1);
        }
    }
    
    selectNextSnapshot() {
        const idx = this.activeBreakpointIdx;
        if (idx !== null && idx < this.history.length - 1) {
            if (idx < this.history.length - 2) {
                runInAction("Select next snapshot", () => this.preferredActiveBreakpoint = idx + 1);
            } else {
                runInAction("Select latest snapshot", () => this.preferredActiveBreakpoint = "latest");
            }
        }
    }
    
    async fetchApi(endpoint: string): Promise<string | null> {
        try {
            const data = await fetch(SERVER + endpoint);
            if (!data.ok) {
                throw new Error("Could not connect");
            } else {
                this.compilerConnectionState = ConnectionState.Connected;
                const text = await data.text();
                return text;
            }
        } catch (e) {
            if (this.compilerConnectionState === ConnectionState.Connected) {
                this.compilerConnectionState = ConnectionState.Disconnected;
            }
            return null;
        }
    }
}
