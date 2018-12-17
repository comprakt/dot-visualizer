import { observer } from "mobx-react";
import * as classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Breakpoint, Model } from "./Model";
import { ReactSVGPanZoom } from 'react-svg-pan-zoom';
import { computed, observable } from "mobx";
import Measure from 'react-measure';

const Toolbar = observer(({ model }) => {
    if (model.compiler_online == null) {
        return (
            <div className="toolbar">
                <div className="btn-row compiler--connecting">
                    <button className="btn">Connecting to Compiler...</button>
                </div>
            </div>
        );
    } else if (model.compiler_online == false) {
        return (
            <div className="toolbar">
                <div className="btn-row compiler--offline">
                    <button className="btn">Compiler Finished Execution</button>
                </div>
            </div>
        );
    }

    return <div className="toolbar compiler--continue">
        <div className="btn-row">
            <button className="btn btn--snapshot-prev" onClick={(e) => { model.previous_snapshot(); }}>Previous</button>
            <button className="btn btn--snapshot-next" onClick={(e) => { model.next_snapshot(); }}>Next</button>
            <button className="btn btn--continue" onClick={(e) => { model.continue_execution(); }}>Continue</button>
        </div>
    </div>;
});

const Sidebar = observer((props) => {
    return <div className="sidebar">
        <BreakpointInfo breakpoint={props.breakpoint} />
        <GraphSelector model={props.model} />
        <BreakpointHistory model={props.model} />
    </div>;
});

const GraphSelector = observer((props) => {
    const model = props.model;
    const method = model.active_method && model.compilation_state ? model.compilation_state.dot_files[model.active_method] : null;


    if (!method) {
        return <div className="graph-selection" />;
    }

    const graphs = Object.keys(model.compilation_state.dot_files);
    graphs.sort();

    const links = graphs.map(function(internal_name, index) {
        let graph = model.compilation_state.dot_files[internal_name];
        let is_active = model.active_method == internal_name;
        return <li data-is-current={is_active}>
            <a href="#" onClick={(e) => { e.preventDefault(); model.set_active_method(internal_name) }}>
                {graph.class_name}.{graph.method_name}</a>
        </li>;
    });

    return <div className="graph-selection">
        <h1>Methods</h1>
        <ul>{links}</ul>
    </div>;
});

const BreakpointInfo = observer((props) => {
    if (!props.breakpoint) {
        return <div className="breakpoint" />;
    } else {
        let file = props.breakpoint.file;
        let line = props.breakpoint.line;
        let column = props.breakpoint.column;
        let label = props.breakpoint.label;

        return <div className="breakpoint">
            <h1>Breakpoint</h1>
            <table>
                <tr><th>Label</th><td>{label}</td></tr>
                <tr><th>File</th><td>{file}</td></tr>
                <tr><th>Line</th><td>{line}</td></tr>
                <tr><th>Column</th><td>{column}</td></tr>
            </table>
        </div>;
    }
});

const BreakpointHistory = observer((props) => {
    if (!props.model.history) {
        return <div className="breakpoint-history" />;
    }

    let last_unrepeated: Breakpoint | null = null;

    const breakpoints = props.model.history.map(function(b: Breakpoint, index) {
        let is_repeated = true;
        if (!last_unrepeated || b.line != last_unrepeated.line || b.column != last_unrepeated.column || b.file != last_unrepeated.file) {
            is_repeated = false;
            last_unrepeated = b;
        }
        let is_active = props.model.active_snapshot == index || (props.model.active_snapshot == null && index + 1 == props.model.history.length);
        return <li data-is-current={is_active} data-is-repeated={is_repeated}>
            <a href="#" onClick={(e) => {
                e.preventDefault();
                if (props.model.compiler_online) {
                    props.model.set_active_snapshot(index);
                }
            }}>
                <span className="label">{b.label}</span> <span className="location">{b.file}@{b.line}</span></a>
        </li>;
    });

    breakpoints.reverse();  // reverse, newest breakpoint on top/index zero

    return <div className="breakpoint-history" data-is-offline={!props.model.compiler_online}>
        <h1>History</h1>
        <ul>{breakpoints}</ul>
    </div>;
});

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
    @observable
    private divRef: HTMLDivElement | null;

    setRef = (ref: HTMLDivElement): void => {
        this.divRef = ref;
    };

    render() {
        const model = this.props.model;
        const breakpoint = model.compilation_state ? model.compilation_state.breakpoint : null;
        const svgContent = model.svg || "";
        return (
            <div className="gui">
                <Toolbar model={model} />
                <Sidebar breakpoint={breakpoint} model={model} />
                <Measure bounds>
                    {({ measureRef, contentRect }) => {
                        return (
                            <div ref={measureRef} className="content">
                                <ReactSVGPanZoom
                                    width={contentRect.bounds!.width} height={contentRect.bounds!.height}>
                                    <svg>
                                        <g dangerouslySetInnerHTML={{ __html: svgContent }} />
                                    </svg>
                                </ReactSVGPanZoom>
                            </div>
                        )
                    }}
                </Measure>
            </div>
        );
    }
}
