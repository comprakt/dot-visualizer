import { observer } from "mobx-react";
import * as classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Model } from "./Model";
import { ReactSVGPanZoom, TOOL_PAN } from 'react-svg-pan-zoom';
import { computed, observable } from "mobx";
import Measure from 'react-measure';

function Toolbar(props) {
    return <div className="toolbar">
        <div className="btn-row">
            <button className="btn">Startknoten</button>
            <button className="btn">Endknoten</button>
            <button className="btn" onClick={(e) => { props.model.continue_execution(); }}>Continue</button>
        </div>
    </div>;
}

function Sidebar(props) {
    return <div className="sidebar">
        <BreakpointInfo breakpoint={props.breakpoint} />
        <GraphSelector model={props.model} />
    </div>;
}

function GraphSelector(props) {
    const model = props.model;
    const method = model.active_method && model.compilation_state ? model.compilation_state.dot_files[model.active_method] : null;


    if (!method) {
        return <div className="graph-selection" />;
    }

    const graphs = Object.keys(model.compilation_state.dot_files);
    graphs.sort();

    const links = graphs.map(function(internal_name, index) {
        let graph = model.compilation_state.dot_files[internal_name];
        let is_active = model.active == internal_name;
        return <li data-is-current={is_active}>
            <a href="#" onClick={(e) => { e.preventDefault(); model.set_active_method(internal_name) }}>
                {graph.class_name}.{graph.method_name}</a>
        </li>;
    });

    return <div className="graph-selection">
        <h1>Methods</h1>
        <ul>{links}</ul>
    </div>;
}

function BreakpointInfo(props) {
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
}

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
                                    tool={TOOL_PAN}
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
