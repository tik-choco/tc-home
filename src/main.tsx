import { render } from 'preact';
import { App } from './app';
import './styles.css';
import { writeAppManifest } from './lib/appManifest';

render(<App />, document.getElementById('app') as HTMLElement);

writeAppManifest({ app: 'tc-home', publishes: [], consumes: [], reads: [] });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
		});
	});
}
