import '@testing-library/jest-dom';

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.scrollTo) {
  window.scrollTo = () => {};
}

if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock';
}

if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}
