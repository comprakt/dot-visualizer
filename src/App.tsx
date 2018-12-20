import { observer } from "mobx-react";
import * as classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Breakpoint, Model, ConnectionState } from "./Model";
import { ReactSVGPanZoom, Tool } from 'react-svg-pan-zoom';
import { computed, observable } from "mobx";
import Measure from 'react-measure';

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
    render() {
        const model = this.props.model;
        const breakpoint = model.activeCompilationState ? model.activeCompilationState.breakpoint : null;
        const svgContent = model.activeSvg || "";
        return (
            <div className="gui">
                <Toolbar model={model} />
                <Sidebar breakpoint={breakpoint} model={model} />
                <SvgPanel svgContent={svgContent} />
            </div>
        );
    }
}

const Toolbar = observer(({ model }: { model: Model }) => {
    if (model.compilerConnectionState === ConnectionState.Connecting) {
        return (
            <div className="toolbar">
                <div className="btn-row compiler--connecting">
                    <button className="btn">Connecting to Compiler...</button>
                </div>
            </div>
        );
    } else if (model.compilerConnectionState === ConnectionState.Disconnected) {
        return (
            <div className="toolbar">
                <div className="btn-row compiler--offline">
                    <button className="btn">Compiler Finished Execution</button>
                </div>
            </div>
        );
    }

    return (
        <div className="toolbar compiler--continue">
            <div className="btn-row">
                <button className="btn btn--snapshot-prev" onClick={(e) => { model.selectPreviousSnapshot(); }}>Previous</button>
                <button className="btn btn--snapshot-next" onClick={(e) => { model.selectNextSnapshot(); }}>Next</button>
                <button className="btn btn--continue" onClick={(e) => { model.continueExecution(); }}>Continue</button>
            </div>
        </div>
    );
});

const Sidebar = observer((props: { breakpoint: Breakpoint|null, model: Model }) => {
    return (
        <div className="sidebar">
            <BreakpointInfo breakpoint={props.breakpoint} />
            <GraphSelector model={props.model} />
            <BreakpointHistory model={props.model} />
        </div>
    );
});

const GraphSelector = observer((props: { model: Model }) => {
    const model = props.model;
    const activeCompilationState = model.activeCompilationState;
    const graph = model.activeMethod && activeCompilationState ? activeCompilationState.graphs[model.activeMethod] : null;

    if (!graph || !activeCompilationState) {
        return <div className="graph-selection" />;
    }

    const graphKeys = Object.keys(activeCompilationState.graphs);
    graphKeys.sort();

    const links = graphKeys.map(key => {
        let graph = activeCompilationState.graphs[key];
        let is_active = model.activeMethod == key;
        return (
            <li key={key} data-is-current={is_active}>
                <a href="#" onClick={(e) => { e.preventDefault(); model.setPreferredActiveMethod(key) }}>
                    {graph.name}
                </a>
            </li>
        );
    });

    return (
        <div className="graph-selection">
            <h1>Graphs</h1>
            <ul>{links}</ul>
        </div>
    );
});

const BreakpointInfo = observer((props: { breakpoint: Breakpoint|null }) => {
    if (!props.breakpoint) {
        return <div className="breakpoint" />;
    } else {
        const bp = props.breakpoint;
        return (
            <div className="breakpoint">
                <h1>Breakpoint</h1>
                <table>
                    <tr><th>Label</th><td>{bp.label}</td></tr>
                    <tr><th>File</th><td>{bp.file}</td></tr>
                    <tr><th>Line</th><td>{bp.line}</td></tr>
                    <tr><th>Column</th><td>{bp.column}</td></tr>
                </table>
            </div>
        );
    }
});

const BreakpointHistory = observer((props: { model: Model }) => {
    const history = props.model.history;
    if (!history) {
        return (
            <div className="breakpoint-history" />
        );
    }

    const activeBreakpointIdx = props.model.activeBreakpointIdx;
    let lastUnrepeated: Breakpoint | null = null;
    const breakpoints = history.map((b: Breakpoint, idx) => {
        let isRepeated = true;
        if (!lastUnrepeated || b.line != lastUnrepeated.line || b.column != lastUnrepeated.column || b.file != lastUnrepeated.file) {
            isRepeated = false;
            lastUnrepeated = b;
        }
        return (
            <li data-is-current={activeBreakpointIdx == idx} data-is-repeated={isRepeated}>
                <a href="#" onClick={(e) => {
                    e.preventDefault();
                    props.model.setActiveSnapshot(idx);
                }}>
                    <span className="label">{b.label}</span> <span className="location">
                        {b.file}@{b.line}
                    </span>
                </a>
            </li>
        );
    });

    breakpoints.reverse(); // reverse, newest breakpoint on top/index zero

    return (
        <div className="breakpoint-history" data-is-offline={props.model.compilerConnectionState !== ConnectionState.Connected}>
            <h1>History</h1>
            <ul>{breakpoints}</ul>
        </div>
    );
});

class SvgPanel extends React.Component<{ svgContent: string }, { tool: Tool }> {
    constructor(props) {
        super(props);
        this.state = { tool: "pan" };
    }

    private readonly setTool = (tool: Tool) => {
        this.setState({ tool });
    };

    render() {
        const { svgContent } = this.props;
        return (
            <Measure bounds>
                {
                    ({ measureRef, contentRect }) => (
                        <div ref={measureRef} className="content">
                            <ReactSVGPanZoom
                                width={contentRect.bounds!.width}
                                height={contentRect.bounds!.height}
                                tool={this.state.tool}
                                onChangeTool={this.setTool}
                            >
                                <svg>
                                    <g dangerouslySetInnerHTML={{ __html: svgContent }} />
                                </svg>
                            </ReactSVGPanZoom>
                        </div>
                    )
                }
            </Measure>
        );
    }
}
