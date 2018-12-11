import { observer } from "mobx-react";
import * as classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Model } from "./Model";
import {ReactSVGPanZoom, TOOL_PAN} from 'react-svg-pan-zoom';
import { computed, observable } from "mobx";
import Measure from 'react-measure';

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	@observable
	private divRef: HTMLDivElement|null;

	setRef = (ref: HTMLDivElement): void => {
		this.divRef = ref;
	};

	render() {
		const model = this.props.model;
		const svgContent = model.svg;
		return (
			<div className="gui">
				{/*<div className="header">
				Url: <input value={model.url} onChange={e => model.url = e.currentTarget.value} type="text" />
		</div>*/}
				<Measure bounds>
					{({ measureRef, contentRect }) => { console.log(contentRect); return (
						<div ref={measureRef} className="content">
							<ReactSVGPanZoom
								tool={TOOL_PAN}
								width={contentRect.bounds!.width} height={contentRect.bounds!.height}>
								<svg width={600} height={1000}>
									<g dangerouslySetInnerHTML={{ __html: svgContent ? svgContent : '' }}/>
								</svg>
							</ReactSVGPanZoom>
						</div>
					)}}
				</Measure>
			</div>
		);
	}
}