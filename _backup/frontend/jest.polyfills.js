import { TextEncoder, TextDecoder } from 'node:util';
import { TransformStream } from 'node:stream/web';

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.Response = globalThis.Response || class Response {
    constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.headers = new Map(Object.entries(init.headers || {}));
        this.ok = this.status >= 200 && this.status < 300;
        this.json = () => Promise.resolve(JSON.parse(this.body));
        this.text = () => Promise.resolve(this.body);
    }
};
globalThis.TransformStream = TransformStream;
globalThis.BroadcastChannel = class BroadcastChannel {
    constructor() {
        this.listeners = [];
    }
    postMessage(message) {
        this.listeners.forEach(listener => listener({ data: message }));
    }
    addEventListener(event, listener) {
        if (event === 'message') {
            this.listeners.push(listener);
        }
    }
    removeEventListener(event, listener) {
        if (event === 'message') {
            this.listeners = this.listeners.filter(l => l !== listener);
        }
    }
    close() {
        this.listeners = [];
    }
};