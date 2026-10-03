import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { demarrerSauvegarde } from './lib/store.svelte';

demarrerSauvegarde(location.hash.startsWith('#/ecran'));

export default mount(App, { target: document.getElementById('app')! });
