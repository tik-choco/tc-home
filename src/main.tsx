import { render } from 'preact';
import { App } from './app';
import './styles.css';

render(<App />, document.getElementById('app') as HTMLElement);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
		});
	});
}
