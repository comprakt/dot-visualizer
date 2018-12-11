import { observable, computed } from "mobx";
import Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

let viz = new Viz({ Module, render });

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

export class Model {
	constructor() {
		this.time = new Date();
		setInterval(() => {
			this.loadData();
		}, 200);
		this.url = getParameterByName("url", window.location);
	}
private i = 0;
	async loadData(): Promise<void> {
		const data = await fetch(this.url);
		const text = await data.text();
		if (text == this.lastText) return;
		if (!text) return;
		this.lastText = text;

		console.log("updated", this.i++);
		const svg = await viz.renderString(text);
		if (text === this.lastText) {
			this.svg = svg;
		}
	}

	@observable url: string = "http://192.168.56.1:8081/CF.M.foo.dot";
	lastText: string|null;

	@observable svg: string|null;

	@observable time: Date;
	@computed get seconds(): number {
		return this.time.getSeconds();
	}
}